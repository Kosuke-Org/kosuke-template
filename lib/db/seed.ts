async function seed() {
  console.log('Starting seed process...');

  // User management is now handled by StackAuth
  // Add any other data seeding logic here if needed

  console.log('Seed process completed. StackAuth handles user management.');
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
