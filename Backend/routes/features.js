const express=require('express');
const { RegisterUser, AuthenticateUser, signoutUser, blockedSites, saveURLsToFirestore, proxyChainsSetup, adultURLS, checkPasswordBreach, checkPhishingSites, checkPhishingSitesURLS, checkSpeedtest, storePassword, sslCertificate, saveTimeLimits, scanDownloadedFiles, scanUrl } = require('../controllers/features.controllers');
const routes=express.Router();

routes.post('/Registration',RegisterUser);
routes.post('/Authentication',AuthenticateUser)
routes.post('/signout',signoutUser)
routes.post('/blockurl',blockedSites)
routes.get('/adultSites/:url',adultURLS)
routes.post('/sites',saveURLsToFirestore)
routes.get('/proxyChains',proxyChainsSetup)
routes.post('/check-password', checkPasswordBreach);
routes.post('/save-time-limits', saveTimeLimits);
routes.post('/phishing-checks',checkPhishingSites);
routes.post('/phishing-check-url',checkPhishingSitesURLS);
routes.get('/speedtest',checkSpeedtest);
routes.post('/scan-downloaded-files',scanDownloadedFiles)
routes.post('/scan-URL',scanUrl)
routes.post('/sslCertificate',sslCertificate);

module.exports=routes;