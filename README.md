
![Logo](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/th5xamgrr6se0x5ro4g6.png)


# Cyber Guard 

Cyber Guard is a browser extension designed to enhance user privacy and safety while browsing. It includes features such as SSL certificate validation, a parental control console for blocking adult content and customizing site restrictions, password testing, VPN connectivity, an ad blocker, proxy support, and phishing protection. The extension's database contains over 1,000 known adult sites, which allows it to check if a site visited by the user is blocked. For SSL certificate validation, the extension verifies a site's certificate in real-time using background scripts. Additionally, the extension uses free proxy servers to ensure secure and anonymous browsing by rerouting requests through the Chrome proxy API.


## Tech Stack

**Client:** HTML,CSS and Bootstrap

**Server:** Node, Express and Firebase


## Authors

- [@edwinkimani](https://github.com/edwinkimani)


## Screenshots

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)



## Installation

Open a terminal and run

```bash
  git clone https://github.com/edwinkimani/Cyber-Guard-web-extension.git

  cd Cyber-Guard-web-extension
```
or

Download as ZIP:
Visit the [repository](https://github.com/edwinkimani/Cyber-Guard-web-extension.git) URL, click on the Code button, and select Download ZIP. Extract the ZIP file to a folder on your computer.

### For Google Chrome or Chromium-Based Browsers
#### Open the Extensions Page
+ Navigate to chrome://extensions/ in the browser
#### Enable Developer Mode
+ Toggle the switch in the top-right corner.
#### Load the Unpacked Extension
+ Click Load unpacked.
+ Select the folder Frontend.
#### Test the Extension
+ After loading, the extension icon should appear in the toolbar or extensions menu.
+ Test the functionality by performing tasks or visiting websites relevant to the extension.
### For back-end set up
navigate to Cyber-Guard-web-extension file

``` bash
cd Backend
```
#### Install Node.js (if not installed)
If you don't have Node.js installed, you can download and install it from the official website  [Node.js](https://nodejs.org/en) 

``` bash
node -v
npm -v
```
#### Install Project Dependencies
Once you’re inside the project folder, install the required dependencies by running:
``` bash
npm install
```
This will install all the packages specified in the package.json file.to run the application once dependencies have been installed run the following
``` bash
npm start
```

### Firebase Email/Password Authentication Setup

This guide will walk you through the process of setting up Firebase Authentication with Email and Password for your project.

#### 1. Create a Firebase Account
If you don’t have a Firebase account yet:
+ Go to the [Firebase Console](https://console.firebase.google.com/).
+ Click **Get Started** and log in with your Google account.

#### 2. Create a New Firebase Project
+ In the Firebase Console, click on **Add Project**.
+ Provide a name for your project and select your country/region.
+ Click **Create Project** to finish setting up your Firebase project.

#### 3. Enable Firebase Authentication with Email/Password
+ In the Firebase Console, navigate to the **Authentication** section on the left sidebar.
+ Click on the **Sign-in method** tab.
+ Locate **Email/Password** in the sign-in provider list and click on it.
+ Enable the Email/Password sign-in method by toggling the **Enable** option.
+ Click **Save** to apply the changes.

#### 4. Set Up Firebase SDK in Your Application
+ Go to the **Project Settings** page in the Firebase Console by clicking the gear icon next to **Project Overview**.
+ Scroll down to the **Your apps** section and select **Web** (</> icon).
+ Copy the Firebase configuration snippet (JavaScript) provided:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
+ navigate to  **/Cyber-Guard-web-extension/Backend/server/firebase.js** and paste the copied snippet.

    