const express = require("express");

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const path = require("path");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const jsonMiddleware = express.json();

const app = express();

app.use(express.json());

let db = null;

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const startDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started at http://localhost:3000");
    });
  } catch (e) {
    process.exit(1);
  }
};
startDBAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken = "";
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(
        jwtToken,
        "abdjdckkdflkioedskjlkdf",
        async (error, payload) => {
          if (error) {
            response.status(401);
            response.send("Invalid JWT Token");
          } else {
            next();
          }
        }
      );
    }
  }
};

//API login method to check whether valid user registered or not
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUser = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isValidPassword = await bcrypt.compare(password, dbUser.password);
    if (isValidPassword === true) {
      const payLoad = { username: username };
      const jwtToken = jwt.sign(payLoad, "abdjdckkdflkioedskjlkdf");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 2 GET Method
app.get("/states/", authenticateToken, async (request, response) => {
  const getUser = `SELECT state_id as stateId,
  state_name as stateName,
  population as population FROM state;`;
  const userResult = await db.all(getUser);
  response.send(userResult);
});

//API 3 GET Method states
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateDetails = `SELECT state_id as stateId,
  state_name as stateName,
  population as population FROM state WHERE state_id = ${stateId};`;
  const getStateResult = await db.get(getStateDetails);
  response.send(getStateResult);
});

//API 4 POST Method
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrictDetails = `INSERT INTO district (district_name,
        state_id,
        cases,
        cured,
        active,
        deaths)
        VALUES ('${districtName}',
            ${stateId},
            ${cases},
            ${cured},
            ${active},
            ${deaths};)`;
  await db.run(addDistrictDetails);
  response.send("District Successfully Added");
});

//API 5 GET District Id using
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `SELECT district_id as districtId,
    district_name as districtName,
    state_id as stateId,
    cases, cured, active, deaths FROM district WHERE district_id = ${districtId};`;
    const getResult = await db.get(getDistrictQuery);
    response.send(getResult);
  }
);

//API 6 DELETE District using id
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

//API 7 PUT Method
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDetails = `UPDATE district SET
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
        WHERE district_id = ${districtId};`;
    await db.run(updateDetails);
    response.send("District Details Updated");
  }
);

//API 8 GET Method
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateDetails = `SELECT 
    SUM(cases) as totalCases,
    SUM(cured) as totalCured,
    SUM(active) as totalActive,
    SUM(deaths) as totalDeaths FROM district NATURAL JOIN state WHERE state_id = ${stateId};`;
    const stateResult = await db.get(getStateDetails);
    response.send(stateResult);
  }
);

module.exports = app;
