// const fs = require('fs');
// const path = require('path');
// require('dotenv').config(); // Load environment variables from the .env file

// const envFilePath = path.resolve(__dirname, '.env');

// // Function to update the .env file
// export async function updateEnvVariable(key, value) {
//   try {
//     // Read the .env file
//     let envVars = fs.readFileSync(envFilePath, 'utf8');

//     // Create a new regex to find the line for the variable
//     const regex = new RegExp(`^${key}=.*`, 'm');

//     if (envVars.match(regex)) {
//       // Replace the line with the updated value
//       envVars = envVars.replace(regex, `${key}=${value}`);
//     } else {
//       // If the key doesn't exist, add it
//       envVars += `\n${key}=${value}`;
//     }

//     // Write the updated content back to the .env file
//     fs.writeFileSync(envFilePath, envVars, 'utf8');
//     console.log(`Updated ${key} in .env file`);
//   } catch (error) {
//     console.error(`Failed to update ${key} in .env file:`, error);
//   }
// }

// // // Example: Update the BEARER_TOKEN
// // const newBearerToken = "new_bearer_token_value";
// // updateEnvVariable('BEARER_TOKEN', newBearerToken);
