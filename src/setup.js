import api, { route } from "@forge/api";

const ISSUE_TYPES = [
  {
    name: "Testcase",
    description: "A test case describing a specific test scenario.",
    type: "standard",
  },
  {
    name: "TestSet",
    description: "A collection of test cases.",
    type: "standard",
  },
  {
    name: "TestRun",
    description: "An execution of a test set.",
    type: "standard",
  },
];

const LINK_TYPES = [
  {
    name: "Test Association",
    inward: "tests",
    outward: "is tested by",
  },
  {
    name: "Test Inclusion",
    inward: "includes",
    outward: "is included in",
  },
  {
    name: "Test Execution",
    inward: "runs",
    outward: "is run by",
  },
];

async function createIssueType(issueType) {
  try {
    const response = await api.asApp().requestJira(route`/rest/api/3/issuetype`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(issueType),
    });

    if (response.status === 201) {
      console.log(`Created issue type: ${issueType.name}`);
    } else if (response.status === 409) {
      console.log(`Issue type already exists: ${issueType.name}`);
    } else {
      const data = await response.json();
      console.error(`Failed to create issue type ${issueType.name}:`, data);
    }
  } catch (error) {
    console.error(`Error creating issue type ${issueType.name}:`, error);
  }
}

async function createLinkType(linkType) {
  try {
    const response = await api.asApp().requestJira(route`/rest/api/3/issueLinkType`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(linkType),
    });

    if (response.status === 201) {
      console.log(`Created link type: ${linkType.name}`);
    } else if (response.status === 409) {
      // 409 might not be returned for duplicates, sometimes it's just an error.
      // We can check existence first, but for simplicity in setup, we try/catch.
      console.log(`Link type might already exist: ${linkType.name}`);
    } else {
      const data = await response.json();
      // Check if it's a duplicate error
      if (data.errors && JSON.stringify(data.errors).includes("already exists")) {
        console.log(`Link type already exists: ${linkType.name}`);
      } else {
        console.error(`Failed to create link type ${linkType.name}:`, data);
      }
    }
  } catch (error) {
    console.error(`Error creating link type ${linkType.name}:`, error);
  }
}

export async function runSetup(event, context) {
  console.log("Running app setup...");
  debugger; // Force debugger to stop here


  console.log("Creating Issue Types...");
  for (const type of ISSUE_TYPES) {
    await createIssueType(type);
  }

  console.log("Creating Link Types...");
  for (const type of LINK_TYPES) {
    await createLinkType(type);
  }

  console.log("App setup complete.");
}
