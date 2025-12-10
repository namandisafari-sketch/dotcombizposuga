import bcrypt from 'bcryptjs';

const password = 'Admin123!';
const hash = bcrypt.hashSync(password, 10);

console.log('\n✅ Hash generated with bcryptjs:\n');
console.log(hash);
console.log('\n📋 Copy this SQL and run it in psql:\n');
console.log(`UPDATE user_credentials SET password_hash = '${hash}' WHERE email = 'admin@test.com';`);
