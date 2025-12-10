const bcrypt = require('bcrypt');

const password = 'Admin123!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }
  
  console.log('\n✅ Password hashed successfully!\n');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nRun this SQL in psql:');
  console.log('----------------------------------------');
  console.log(`UPDATE user_credentials SET password_hash = '${hash}' WHERE email = 'admin@test.com';`);
  console.log('----------------------------------------\n');
});
