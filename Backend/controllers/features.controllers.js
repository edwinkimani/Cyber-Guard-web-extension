const firebaseApp = require("../server/firebase");
const https = require("https");
const net = require("net");
const ping = require("ping");
const FastSpeedtest = require("fast-speedtest-api");
let cachedAdultURLs = null;
let cachedPhishing = null;
let lastFetched = null;
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;
const levenshtein = require("fast-levenshtein");

const HttpErrors = require("http-errors");
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const {
  setDoc,
  doc,
  getFirestore,
  writeBatch,
  collection,
  orderBy,
  startAt,
  endAt,
  getDocs,
  query,
} = require("firebase/firestore/lite");
const { default: axios } = require("axios");
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const path = require("path");
const fs = require("fs");
const url = require("url");
const SIMILARITY_THRESHOLD = 3;

// Function to encrypt the password

const wordListPath = path.join(
  __dirname,
  "../utilities/passwords-word-list.txt"
);

// Preload the wordList into memory
let wordListSet = new Set();

try {
  const wordListData = fs.readFileSync(wordListPath, "utf-8");
  wordListSet = new Set(wordListData.split("\n").map((line) => line.trim()));
  console.log(`Loaded ${wordListSet.size} passwords into memory.`);
} catch (error) {
  console.error("Error loading word list:", error);
}

module.exports = {
  RegisterUser: async (req, res, next) => {
    const { name, email, password, passwordConfirm } = req.body;

    try {
      if (password !== passwordConfirm) {
        return res.status(400).json({
          message: "The two passwords don't match",
        });
      }

      // Regular expression for password validation
      const PASSWORD_REGEX =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?!.*\s).{8,}$/;
      if (!PASSWORD_REGEX.test(password)) {
        return res.status(400).json({
          message: "The password provided is invalid",
        });
      }

      // Capture the client's IP address
      const ipAddress =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const userId = user.uid;

      try {
        // Save user information, including IP address, in Firestore
        await setDoc(doc(db, "users", userId), {
          name: name,
          email: email,
          createdAt: new Date(),
          ipAddress: ipAddress,
        });

        // Return success response if no error was thrown
        return res.status(200).json({
          message: `User registered successfully: ${user.email}`,
        });
      } catch (error) {
        // Handle any errors that occurred during Firestore save
        console.error("Error creating user document:", error);
        return res.status(500).json({
          message: error.message || "Internal Server Error",
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: error.message || "Internal Server Error",
      });
    }
  },

  AuthenticateUser: async (req, res, next) => {
    const { email, password } = req.body;

    try {
      // Attempt to sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      console.log(user);

      if (user) {
        res.status(200).json({
          message: "Authentication successful",
          validation: true,
          user: {
            uid: user.uid,
            email: user.email,
            // Add other user info as needed, avoiding sensitive data
          },
        });
      }
      // Respond with status 200 and user information (consider omitting sensitive data)
    } catch (error) {
      // Respond with status 401 and error message
      res.status(401).json({
        message: error.message || "Authentication failed",
        validation: false,
      });
    }
  },

  blockedSites: async (req, res, next) => {
    const { url, uid } = req.body;
    try {
      await setDoc(doc(db, "blockedURL"), {
        url: url,
        uid: uid,
        createdAt: new Date(),
      });
      return res.status(200).json({
        message: `url added successfully`,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  },

  signoutUser: async (req, res, next) => {
    try {
      res.status(200).json({
        message: "this is the signout route",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  },

  adultURLS: async (req, res, next) => {
    try {
      const ip = req.headers["x-forwarded-for"] || req.ip; // Gets client IP
      console.log(ip);

      // Check if we need to fetch new data
      if (!cachedAdultURLs || Date.now() - lastFetched > CACHE_EXPIRATION_MS) {
        await fetchAdultURLs();
      }

      // Get the URL from the request payload
      const encodedUrl = req.params.url;
      const url = decodeURIComponent(encodedUrl);

      // Sanitize the input URL to get the domain
      const sanitizedUrl = url.replace(/(^https?:\/\/)|(\/$)/g, ""); // Remove http(s):// and trailing slashes
      console.log("Sanitized URL:", sanitizedUrl);

      // Check if the sanitized URL exists in the cached adult URLs
      if (cachedAdultURLs.includes(sanitizedUrl)) {
        console.log("found");
        return res.status(200).send({
          message: "URL found, url not allowed",
          item: true,
          url: url, // Sending the found URL in the response
        });
      } else {
        console.log("not found");
        return res.status(200).send({
          message: "No URL found",
          item: false,
        });
      }
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).send("Error retrieving URLs from the HOSTS file.");
    }
  },

  saveURLsToFirestore: async (req, res, next) => {
    const jsonFilePath = "C:\\Users\\Edwin Ngila\\Desktop\\sites.json";

    try {
      // Read URLs from the JSON file
      const data = fs.readFileSync(jsonFilePath, "utf8");
      const urls = JSON.parse(data);

      // Reference to the Firestore collection
      const urlsCollection = collection(db, "urls");

      // Create a batch to handle multiple writes
      const batch = writeBatch(db);

      // Loop through each URL and prepare to save it to Firestore
      for (let i = 0; i < urls.length; i++) {
        const urlObject = urls[i];
        const url = urlObject.domain;

        // Use a new document reference for each URL
        const urlDoc = doc(urlsCollection);
        batch.set(urlDoc, { url });

        // Commit the batch every 500 operations to avoid memory issues
        if ((i + 1) % 500 === 0) {
          await batch.commit();
          console.log(`Batch of ${i + 1} URLs saved to Firestore.`);
          batch = writeBatch(db); // Create a new batch
        }
      }

      // Commit any remaining operations
      await batch.commit();
      console.log("All URLs have been saved to Firestore.");
      res.status(200).send("All URLs have been saved to Firestore.");
    } catch (err) {
      console.error("Error:", err);
      res.status(500).send("Error saving URLs to Firestore.");
    }
  },

  // Controller function to set up proxy chains
  proxyChainsSetup: async (req, res) => {
    try {
      const url =
        "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt";
      const ipList = await fetchIpList(url);

      // Improved randomness
      const randomIPs = getRandomIPs(ipList, 20); // Select more IPs initially

      let reachableIPs = await Promise.all(
        randomIPs.map(async (line) => {
          const match = line.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
          if (match) {
            const ip = match[1];
            const port = parseInt(match[2], 10);

            const startTime = Date.now();
            const isReachable = await checkIpPort(ip, port);
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (isReachable) {
              const geoData = await fetchGeoLocation(ip);
              const speedTest = await testProxySpeed(ip, port);
              return {
                ip: `${ip}`,
                port: `${port}`,
                location: geoData,
                speedTest: speedTest,
                responseTime,
              };
            }
          }
          return null;
        })
      );

      reachableIPs = reachableIPs.filter((ip) => ip !== null); // Remove null entries

      // Sort by response time to get fastest IPs
      reachableIPs.sort((a, b) => a.responseTime - b.responseTime);

      res.json({
        message: "Random IP check completed!",
        reachableIPs: reachableIPs.slice(0, 2), // Take the top 5 fastest
      });
    } catch (error) {
      console.error("Error setting up proxy chains:", error);
      res.status(500).json({ message: "Failed to set up proxy chains." });
    }
  },

  checkPasswordBreach: async (req, res) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Password is required." });
      }
      // Exact match check
      if (wordListSet.has(password)) {
        return res.status(200).json({
          message:
            "Password matches a commonly used password. Please change it.",
          isBreached: true,
          exactMatch: true,
        });
      }
      // Approximate match check
      let isSimilar = false;
      let similarPasswords = [];
      const wordListArray = Array.from(wordListSet); // Convert Set to Array for iteration

      for (const word of wordListArray) {
        // Skip passwords with vastly different lengths for efficiency
        if (Math.abs(password.length - word.length) > 2) {
          continue;
        }

        const distance = levenshtein.get(password, word);
        const maxLength = Math.max(password.length, word.length);
        const similarity = ((1 - distance / maxLength) * 100).toFixed(2);

        if (similarity >= 90) {
          isSimilar = true;
          similarPasswords.push({ word, similarity });
        }
      }

      if (isSimilar) {
        return res.status(200).json({
          message:
            "Password is too similar to commonly used passwords. Please change it.",
          similarPasswords,
          isBreached: true,
          exactMatch: false,
        });
      }

      // Integrity Checks
      const isValidLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      const hasWeakPatterns = /(123|password|abc|qwerty|letmein)/i.test(
        password
      ); // Simple pattern check (you can expand this)

      // Evaluate entropy (variety of characters)
      const uniqueChars = new Set(password);
      const hasHighEntropy = uniqueChars.size >= password.length * 0.7; // At least 70% unique characters

      // Combine all checks
      if (!isValidLength) {
        return res.status(200).json({
          message: "Password is too short. It must be at least 8 characters.",
          isBreached: false,
          exactMatch: false,
        });
      }

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
        return res.status(200).json({
          message:
            "Password must contain a mix of uppercase, lowercase, numbers, and special characters.",
          isBreached: false,
          exactMatch: false,
        });
      }

      if (hasWeakPatterns) {
        return res.status(200).json({
          message: "Password contains common patterns. Please change it.",
          isBreached: false,
          exactMatch: false,
        });
      }

      if (!hasHighEntropy) {
        return res.status(200).json({
          message:
            "Password lacks sufficient variety. Consider using more unique characters.",
          isBreached: false,
          exactMatch: false,
        });
      }

      // If all integrity checks pass, the password is considered strong
      res.status(200).json({
        message: "Password is sufficiently strong and unique.",
        isBreached: false,
        exactMatch: false,
      });
    } catch (error) {
      console.error("Error checking password integrity:", error);
      res.status(500).json({
        error: "An error occurred while checking password integrity.",
      });
    }
  },

  checkPhishingSites: async (req, res) => {
    try {
      console.log("Full request body:", req.body);
      const { urls } = req.body;

      if (!urls || !Array.isArray(urls)) {
        return res
          .status(400)
          .json({ error: "Please provide an array of URLs." });
      }

      console.log("Received URLs:", urls);

      // Fetch phishing data if cache is stale
      if (!cachedPhishing || Date.now() - lastFetched > CACHE_EXPIRATION_MS) {
        await fetchPhishing();
      }

      // Utility function to normalize URLs
      const normalizeUrl = (url) => {
        try {
          const parsedUrl = new URL(url);
          return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
        } catch (e) {
          console.warn("Invalid URL detected and skipped:", url);
          return null; // Skip invalid URLs
        }
      };

      // Normalize cached phishing URLs
      const normalizedPhishingUrls = new Set(
        cachedPhishing.map(normalizeUrl).filter(Boolean)
      );

      // Normalize input URLs and check against phishing data
      const results = urls.map((url) => {
        const normalizedUrl = normalizeUrl(url);
        if (!normalizedUrl) return { url, found: false };

        console.log("Checking URL:", normalizedUrl);
        return {
          url,
          found: normalizedPhishingUrls.has(normalizedUrl),
        };
      });

      // Split results into found/not found
      const foundUrls = results.filter((result) => result.found);

      // Send response
      return res.status(200).json({
        message: "Phishing URL check completed.",
        foundUrls: foundUrls.map((result) => result.url),
      });
    } catch (err) {
      console.error("Server Error:", err);
      return res
        .status(500)
        .json({ error: "Error processing the phishing URL check." });
    }
  },

  checkPhishingSitesURLS: async (req, res, next) => {
    try {
      // Check if we need to fetch new data
      if (!cachedPhishing || Date.now() - lastFetched > CACHE_EXPIRATION_MS) {
        await fetchPhishing();
      }

      // Get the URL from the request payload
      const { url } = req.body;
      console.log("Sanitized URL:", url);

      // Normalize the input URL (remove protocol and trailing slashes)
      const normalizeUrl = (inputUrl) => {
        try {
          const parsed = new URL(inputUrl);
          return parsed.hostname + parsed.pathname.replace(/\/+$/, "");
        } catch (error) {
          return inputUrl; // Return as-is if it's not a valid URL
        }
      };

      const normalizedInput = normalizeUrl(url);
      console.log("Normalized Input URL:", normalizedInput);

      // Normalize the cached phishing URLs
      const normalizedPhishingUrls = cachedPhishing.map(normalizeUrl);

      // Check for 90% similarity using Levenshtein distance
      const matches = normalizedPhishingUrls.filter((phishingUrl) => {
        const distance = levenshtein.get(normalizedInput, phishingUrl);
        const maxLength = Math.max(normalizedInput.length, phishingUrl.length);
        const similarity = 1 - distance / maxLength; // Similarity as a percentage
        return similarity >= 0.9; // Match if similarity is 90% or higher
      });

      if (matches.length > 0) {
        console.log("90% match found:", matches);
        return res.status(200).send({
          message: "URL resembles known phishing URLs, not allowed",
          item: true,
          matches, // Return the matched URLs
        });
      }

      console.log("No matches found");
      return res.status(200).send({
        message: "No URL found",
        item: false,
      });
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).send("Error retrieving URLs from the HOSTS file.");
    }
  },

  checkSpeedtest: async (req, res, next) => {
    try {
      const url = req.params.url;
      let speedtest = new FastSpeedtest({
        token: process.env.FAST_SPEEDTEST_TOKEN, // required
        verbose: false, // default: false
        timeout: 10000, // default: 5000
        https: true, // default: true
        urlCount: 5, // default: 5
        bufferSize: 8, // default: 8
        unit: FastSpeedtest.UNITS.Mbps, // default: Bps
      });
      speedtest
        .getSpeed()
        .then((s) => {
          console.log(`Speed: ${s} Mbps`);
          return res.status(200).send({
            message: "Speed test result",
            speed: `${s} Mbps`,
          });
        })
        .catch((e) => {
          res.status(500).send("Error retrieving URLs from the HOSTS file.");
          console.error(e.message);
        });
    } catch (err) {
      console.error("Error:", err);
    }
  },

  saveTimeLimits: async (req, res, next) => {
    try {
      const { url, timeLimit, userId } = req.body;
      await setDoc(doc(db, "timeLimits", userId), {
        userId: userId,
        timeLimit: timeLimit,
        url: url,
      });
      res.status(200).send({
        message: "Time limit saved successfully",
      });
    } catch (err) {
      console.error("Error:", err);
      res.status(500).send("Error saving time limit");
    }
  },

  sslCertificate: async (req, res, next) => {
    try {
      const { domain } = req.body;
      const hostname = new URL(domain).hostname;
  
      const getSSLCertificateInfo = (hostname) => {
        return new Promise((resolve, reject) => {
          const options = {
            hostname: hostname,
            port: 443,
            method: "GET",
            rejectUnauthorized: false,  // Allow expired/self-signed certs
          };
  
          const req = https.request(options, (response) => {
            const certificate = response.socket.getPeerCertificate();
            
            if (certificate && Object.keys(certificate).length !== 0) {
              const validFrom = new Date(certificate.valid_from);
              const validTo = new Date(certificate.valid_to);
              const now = new Date();
  
              const isExpired = now > validTo;
              const isNotYetValid = now < validFrom;
  
              if (isExpired || isNotYetValid) {
                reject({
                    issuedTo: certificate.subject.CN || "Unknown",
                    issuedBy: certificate.issuer.CN || "Unknown",
                    validityPeriod: {
                      validFrom: certificate.valid_from,
                      validTo: certificate.valid_to,
                    },
                    isValid: false,
                });
              } else {
                resolve({
                  issuedTo: certificate.subject.CN || "Unknown",
                  issuedBy: certificate.issuer.CN || "Unknown",
                  validityPeriod: {
                    validFrom: certificate.valid_from,
                    validTo: certificate.valid_to,
                  },
                  isValid: true,
                });
              }
            } else {
              reject({ error: "No SSL Certificate Found" });
            }
          });
  
          // Handle TLS errors (expired, self-signed, etc.)
          req.on("error", (e) => {
            let errorType = "Connection Error";
            switch (e.code) {
              case "ECONNREFUSED":
                errorType = "Connection Refused";
                break;
              case "EHOSTUNREACH":
                errorType = "Host Unreachable";
                break;
              case "CERT_HAS_EXPIRED":
                errorType = "Certificate Expired";
                break;
              case "DEPTH_ZERO_SELF_SIGNED_CERT":
                errorType = "Self-Signed Certificate";
                break;
              case "ERR_TLS_CERT_ALTNAME_INVALID":
                errorType = "Hostname Mismatch";
                break;
              default:
                break;
            }
            reject({
              error: errorType,
              details: e.message,
            });
          });
  
          req.end();
        });
      };
  
      // Fetch certificate information
      const certificateInfo = await getSSLCertificateInfo(hostname);
      res.status(200).send({
        message: "SSL Certificate Information",
        data: certificateInfo,
      });
  
    } catch (err) {
      console.error("Error:", err);
  
      res.status(500).send({
        error: err.error || "Error fetching SSL certificate",
        details: err.data || err.details || "",
      });
    }
  },
  
  scanDownloadedFiles: async (req, res, next) => {
    try {
      axios
        .post(
          "https://www.virustotal.com/api/v3/files",
          {
            file: "path/to/file",
          },
          {
            headers: {
              "x-apikey":
                "b838d3e1df9e69496fe4885c3c3e28c792951535913c2f7d6c67b20a8ce1370e",
            },
          }
        )
        .then((response) => {
          const scanResults = response.data.data.attributes;
          res.status(200).send({
            message: "Scan Results",
            data: scanResults,
          });
        })
        .catch((error) => {
          console.error("Error:", error);
          res.status(500).send({
            error: error.message || "Error scanning file",
          });
        });
    } catch (err) {
      console.error("Error:", err);
      res.status(500).send({
        error: err.message || "Error scanning file",
      });
    }
  },
  scanUrl: async (req, res, next) => {
    const { url } = req.body;
    const apiKey = process.env.VIRUSTOTAL_API_KEY;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      // Step 1: Submit URL for analysis
      const response = await fetch("https://www.virustotal.com/api/v3/urls", {
        method: "POST",
        headers: {
          "x-apikey": apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `url=${encodeURIComponent(url)}`,
      });

      const data = await response.json();

      if (!data.data || !data.data.id) {
        throw new Error("Failed to get analysis ID.");
      }

      const analysisId = data.data.id;


      // Step 2: Fetch the analysis results
      const analysisResponse = await fetch(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        {
          method: "GET",
          headers: {
            "x-apikey": apiKey,
          },
        }
      );

      const analysis = await analysisResponse.json();

      console.log(analysis) 

      if (analysis.data && analysis.data.attributes) {
        const stats = analysis.data.attributes.stats;

        if (stats) {
          res.json({
            url,
            malicious: stats.malicious || 0,
            harmless: stats.harmless || 0,
            suspicious: stats.suspicious || 0,
            undetected: stats.undetected || 0,
          });
        } else {
          res
            .status(202)
            .json({ message: "Scan in progress or no results yet." });
        }
      } else {
        res
          .status(202)
          .json({ message: "Scan in progress, please try again later." });
      }
    } catch (error) {
      console.error("Error scanning URL:", error);
      res.status(500).json({ error: "Failed to scan URL." });
    }
  },
};

//helper functions
// Function to fetch IP list
function fetchIpList(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data.split("\n")));
      })
      .on("error", (err) => reject(err));
  });
}

const extractDomain = (url) => {
  try {
    // Parse the URL to get the hostname
    const { hostname } = new URL(url.includes("://") ? url : `https://${url}`);
    // Remove "www." if it exists
    return hostname.replace(/^www\./, "");
  } catch (e) {
    console.error("Invalid URL:", url);
    return null;
  }
};

// Function to check if IP and port are reachable
function checkIpPort(ip, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.connect(port, ip, () => {
      console.log(`${ip}:${port} is reachable.`);
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      console.log(`${ip}:${port} is not reachable.`);
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      console.log(`${ip}:${port} is not reachable.`);
      socket.destroy();
      resolve(false);
    });
  });
}

// Function to fetch geolocation data for an IP address
async function fetchGeoLocation(ip) {
  const apiKey = process.env.Access_Token; // Replace with your ipinfo.io API key
  const url = `https://ipinfo.io/${ip}/json?token=${apiKey}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country,
        region: data.region,
        city: data.city,
        org: data.org,
        loc: data.loc,
      };
    } else {
      return { error: "Failed to fetch location" };
    }
  } catch (error) {
    console.error(`Error fetching geolocation for IP ${ip}:`, error);
    return { error: "Error fetching location" };
  }
}

// Utility function to get random IPs from list
function getRandomIPs(list, num) {
  const result = [];
  const len = list.length;
  for (let i = 0; i < num; i++) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * len);
    } while (result.includes(list[randomIndex]));
    result.push(list[randomIndex]);
  }
  return result;
}

const isSimilarUrl = (inputUrl, cachedUrls, threshold = 0.8) => {
  return cachedUrls.some((cachedUrl) => {
    const distance = levenshtein.get(inputUrl, cachedUrl);
    const maxLen = Math.max(inputUrl.length, cachedUrl.length);
    const similarity = 1 - distance / maxLen; // Calculate similarity ratio
    return similarity >= threshold; // Compare against the threshold
  });
};

const fetchAdultURLs = async () => {
  try {
    const response = await axios.get(
      "https://raw.githubusercontent.com/4skinSkywalker/Anti-Porn-HOSTS-File/refs/heads/master/HOSTS.txt",
      {
        timeout: 5000, // Set a timeout of 5 seconds
      }
    );
    lastFetched = Date.now();

    // Extract only the domain names from the hosts file
    cachedAdultURLs = response.data
      .split("\n")
      .filter((line) => line && !line.startsWith("#")) // Ignore empty lines and comments
      .map((line) => line.split(/\s+/)[1]) // Extract the domain name
      .map((line) => line.trim());

    console.log("Adult URLs fetched and cached.");
  } catch (error) {
    console.error("Error fetching adult URLs:", error);
    // Handle the error as needed
  }
};

const fetchPhishing = async () => {
  try {
    const response = await axios.get(
      "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt",
      {
        timeout: 5000, // Set a timeout of 5 seconds
      }
    );
    lastFetched = Date.now();

    // Utility function to normalize URLs
    const normalizeUrl = (url) => {
      try {
        const parsedUrl = new URL(url);
        return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
      } catch (e) {
        console.warn("Invalid URL detected in fetched data and skipped:", url);
        return null; // Skip invalid URLs
      }
    };

    // Extract and normalize URLs, ignoring empty lines and comments
    cachedPhishing = response.data
      .split("\n")
      .filter((line) => line && !line.startsWith("#")) // Ignore empty lines and comments
      .map((line) => normalizeUrl(line.trim())) // Trim and normalize each line
      .filter(Boolean); // Remove null values from invalid URLs

    console.log("Phishing URLs fetched and cached.");
  } catch (error) {
    console.error("Error fetching Phishing URLs:", error);
    cachedPhishing = cachedPhishing || []; // Fall back to an empty list or previous cache
  }
};

const testProxySpeed = async (proxyHost, proxyPort) => {
  try {
    // Perform a ping to the proxy host without the port number
    const result = await ping.promise.probe(proxyHost);

    if (result.alive) {
      const speedtest = new FastSpeedtest({
        token: process.env.FAST_SPEEDTEST_TOKEN,
        verbose: false,
        timeout: 15000, // Increased timeout
        https: true,
        urlCount: 5,
        bufferSize: 8,
        unit: FastSpeedtest.UNITS.Mbps,
      });

      speedtest.proxy = `http://${proxyHost}:${proxyPort}`;

      const downloadSpeed = await speedtest.getSpeed();

      return {
        download: `${downloadSpeed.toFixed(2)} Mbps`,
        latency: result.time, // Get latency from ping result
        timeConnected: new Date().toISOString(),
      };
    } else {
      console.log("Proxy is not reachable.");
      return {
        download: "N/A",
        upload: "N/A",
        latency: "N/A",
        timeConnected: "N/A",
      };
    }
  } catch (error) {
    console.error(
      `Error testing speed for proxy ${proxyHost}:${proxyPort}:`,
      error
    );
    return {
      download: "N/A",
      upload: "N/A",
      latency: "N/A",
      timeConnected: "N/A",
    };
  }
};
