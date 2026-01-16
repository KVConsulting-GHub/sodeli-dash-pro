const fs = require("fs");
const path = require("path");
const allowedPath = path.join(__dirname, "allowedEmails.json");

const filePath = path.join(__dirname, "users.json");

function isEmailAllowed(email) {
  const raw = fs.readFileSync(allowedPath, "utf-8");
  const { allowed } = JSON.parse(raw);
  return allowed.includes(email);
}

function readStore() {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeStore(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function findUserByEmail(email) {
  const store = readStore();
  return store.users.find((u) => u.email === email);
}

function createUser(user) {
  const store = readStore();
  store.users.push(user);
  writeStore(store);
}

module.exports = {
  findUserByEmail,
  createUser,
  isEmailAllowed,
};
