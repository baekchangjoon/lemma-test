import api, { route } from "@forge/api";

// Mapping of Issue Type Name -> Allowed Link Rules
// Rule format: { linkTypeInward: "includes", allowedTargetTypes: ["Testcase"] }
// We need to know the direction of the link created.
// The event payload gives us inwardIssue and outwardIssue.
// We need to check both directions or just one depending on how we define the rules.

// Let's define rules based on the "Source" (Outward) issue type.
// When A links to B with type T.
// If T is "includes" (Outward name for "Test Inclusion"), then A must be TestSet and B must be Testcase.

const RULES = {
    "TestSet": {
        "includes": ["Testcase"], // TestSet includes Testcase
        "is run by": ["TestRun"], // TestSet is run by TestRun
        "__allowed_targets__": ["Testcase", "TestRun"] // Strict rule: TestSet can ONLY link to these types
    },
    "Testcase": {
        "tests": ["*"], // Testcase tests Anything (or specific?) - User said "tests" other work items. Let's allow all for now.
        "is included in": ["TestSet"], // Testcase is included in TestSet
        "is tested by": ["TestRun"], // Testcase is tested by TestRun
    },
    "TestRun": {
        "runs": ["TestSet"], // TestRun runs TestSet
        "__blocked_targets__": ["Testcase"] // Strict rule: TestRun cannot link to Testcase
    }
};

// Helper to get Issue Type Name from ID
async function getIssueTypeName(issueId) {
    const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueId}?fields=issuetype`);
    const data = await response.json();
    return data.fields.issuetype.name;
}

export async function validateLink(event, context) {
    console.log("Validating link creation event:", JSON.stringify(event));

    const { issueLink } = event;
    const { id: linkId, type: linkType, sourceIssueId, destinationIssueId } = issueLink;

    // We need the *names* of the link type directions to match our rules.
    // The event payload for linkType usually contains 'inward' and 'outward' names.
    // Let's assume we get them. If not, we might need to fetch them.
    // Checking event payload structure documentation...
    // Payload: issueLink: { id, sourceIssueId, destinationIssueId, type: { id, name, inward, outward } }

    const linkTypeName = linkType.name; // e.g., "Test Inclusion"
    const outwardName = linkType.outward; // e.g., "includes"
    const inwardName = linkType.inward; // e.g., "is included in"

    try {
        const sourceType = await getIssueTypeName(sourceIssueId);
        const destType = await getIssueTypeName(destinationIssueId);

        console.log(`Link: ${sourceType} (${sourceIssueId}) --[${outwardName}]--> ${destType} (${destinationIssueId})`);

        let isValid = true;
        let violationMessage = "";

        if (RULES[sourceType]) {
            // 1. Check Strict Allowed Targets (if defined)
            const strictAllowed = RULES[sourceType]["__allowed_targets__"];
            if (strictAllowed) {
                if (!strictAllowed.includes(destType)) {
                    isValid = false;
                    violationMessage = `${sourceType} can ONLY be linked to ${strictAllowed.join(" or ")}.`;
                }
            }

            // 2. Check Strict Blocked Targets (if defined)
            const strictBlocked = RULES[sourceType]["__blocked_targets__"];
            if (isValid && strictBlocked) {
                if (strictBlocked.includes(destType)) {
                    isValid = false;
                    violationMessage = `${sourceType} cannot be linked to ${destType}.`;
                }
            }

            // 3. Check specific link type rules (existing logic)
            if (isValid) {
                const allowedTargets = RULES[sourceType][outwardName];
                if (allowedTargets) {
                    if (!allowedTargets.includes("*") && !allowedTargets.includes(destType)) {
                        isValid = false;
                        violationMessage = `${sourceType} cannot '${outwardName}' a ${destType}.`;
                    }
                } else {
                    // If the link type is one of OURS, but not explicitly allowed in the rules, block it.
                    const ourLinkTypes = ["Test Association", "Test Inclusion", "Test Execution"];
                    if (ourLinkTypes.includes(linkTypeName)) {
                        isValid = false;
                        violationMessage = `${sourceType} cannot use link type '${linkTypeName}' ('${outwardName}').`;
                    }
                }
            }
        } else {
            // Source is not one of our special types (e.g. it's a Story).
            // Block our link types for non-test types.
            const ourLinkTypes = ["Test Association", "Test Inclusion", "Test Execution"];
            if (ourLinkTypes.includes(linkTypeName)) {
                isValid = false;
                violationMessage = `${sourceType} cannot use link type '${linkTypeName}'.`;
            }
        }

        if (!isValid) {
            console.log(`Invalid link detected: ${violationMessage}. Deleting link ${linkId}...`);

            // Delete the link
            await api.asApp().requestJira(route`/rest/api/3/issueLink/${linkId}`, {
                method: "DELETE",
            });

            // Add comment to source issue
            await api.asApp().requestJira(route`/rest/api/3/issue/${sourceIssueId}/comment`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    body: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: `❌ Link removed: ${violationMessage}`,
                                        marks: [{ type: "strong" }]
                                    }
                                ]
                            }
                        ]
                    }
                })
            });
        } else {
            console.log("Link is valid.");
        }

    } catch (error) {
        console.error("Error validating link:", error);
    }
}
