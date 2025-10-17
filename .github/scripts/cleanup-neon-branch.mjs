const apiKey = process.env.NEON_API_KEY;
const projectId = process.env.NEON_PROJECT_ID;
const branchName = process.env.BRANCH_NAME;

if (!apiKey || !projectId || !branchName) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const neonBranchName = `preview/${branchName}`;

try {
  // Get branch ID
  const listRes = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}/branches`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!listRes.ok) {
    throw new Error(`Failed to list branches: ${listRes.status}`);
  }

  const data = await listRes.json();
  const branch = data.branches.find((b) => b.name === neonBranchName);

  if (!branch) {
    console.log(`Branch ${neonBranchName} not found in Neon, skipping`);
    process.exit(0);
  }

  console.log(`Found branch ${neonBranchName} with ID ${branch.id}, deleting...`);

  // Delete branch
  const deleteRes = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branch.id}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!deleteRes.ok) {
    throw new Error(`Failed to delete branch: ${deleteRes.status}`);
  }

  console.log(`✓ Successfully deleted Neon branch: ${neonBranchName}`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
