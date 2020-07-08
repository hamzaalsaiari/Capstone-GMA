# Capstone-GMA
A grant management system created for the Capstone project in Abu Dhabi University

Installation Steps:

1) git clone https://github.com/hamzaalsaiari/Capstone-GMA
2) npm install
3) npm start


Database Reset: 

If you wish to reset the database then type

npm run db

This will delete all data from the database and add 20 grants and 20 users from the excel file and an admin account.
The default admin credentials are:

email: admin1@admins.com
password: 1234567

The users are created based on the PI and Co-PI name from the excel file
Once this is done then each user account can be logged in to with the format

email: <FirstnameLastname>@users.com
password: 1234567
  
(example if there is user with name Michael Scott then the email will be MichaelScott@users.com>

Config Options:

the .env file contains the following:

MONGODB_URI: The link to the MongoDB database. Change this if you wish to use another database. 
PORT: The port on which the app starts in. Do not change. 
SECRET: The key which is used to sign JSON Web Tokens when users log in

