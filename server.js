const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
var mysql = require("mysql");
require("dotenv").config();
const bcrypt = require("bcryptjs")
const app = express();
const http = require('http');
const server = http.createServer(app);
const CONFIG = require('./config/appConstants')
app.use(express.json());
const helper = require("./utils/helper");
const jwt = require("jsonwebtoken")
var passwordValidator = require('password-validator');


//Add cors CROS (cross plotform enable)
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

var db1 = mysql.createPool({
  connectionLimit: 100,
  host: process.env.host,
  database: process.env.database,
  user: process.env.user,
  password: process.env.password,
  port: process.env.DbPort
})


app.use(express.static("public"));
const PORT = 5001;
server.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT} `
  );
});
app.use(bodyParser.json());


app.post("/createUser", async (req, res) => {
  const userId = "UID" + "" + Math.floor((Math.random() * 100000000000000) + 1);
  var schema = new passwordValidator();
  schema
    .is().min(8)
    .is().max(100)
    .has().uppercase()
    .has().lowercase()
    .has().digits(2)
    .has().not().spaces()
  const passwordValidate = schema.validate(req.body.password, { details: true })
  if (passwordValidate == []) {
    const userName = req.body.userName;
    const password = bcrypt.hashSync(req.body.password, parseInt(process.env.SALTROUNDS));
    const authToken = jwt.sign({ id: userId }, process.env.JWT_SECRET);
    db1.getConnection(async (err, connection) => {
      if (err) throw (err)
      const sqlSearch = "SELECT * FROM users WHERE userName = ?"
      const search_query = mysql.format(sqlSearch, [userName])
      const sqlInsert = "INSERT INTO users VALUES (?,?,?,?)"
      const insert_query = mysql.format(sqlInsert, [userId, userName, password, authToken])
      await connection.query(search_query, async (err, result) => {
        if (err) {
          sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
          throw (err)
        }
        if (result.length != 0) {
          connection.release()
          sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.USER_EXISTS);
        }
        else {
          await connection.query(insert_query, (err, result) => {
            connection.release()
            if (err) {
              sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
            }
            sendResponse(200, res, CONFIG.customMessage.USER_CREATED, authToken);

          })
        }
      })
    })
  }
  else {
    sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.INVALID_PASSWORD, passwordValidate);
  }

})

app.post("/login", (req, res) => {
  const userName = req.body.userName
  const password = req.body.password
  db1.getConnection(async (err, connection) => {
    if (err) throw (err)
    const sqlSearch = "SELECT * FROM users where userName = ?"
    const search_query = mysql.format(sqlSearch, [userName])
    await connection.query(search_query, async (err, result) => {
      connection.release()

      if (err) throw (err)
      if (result.length == 0) {
        sendResponse(404, res, CONFIG.STATUS_MSG.ERROR.USER_DOESNT_EXISTS);
      }
      else {
        const hashedPassword = result[0].password
        const authToken = jwt.sign({ id: result[0].userId }, process.env.JWT_SECRET);
        const sqlupdate = "UPDATE users SET authToken = ? WHERE authToken = ?"
        const update_query = mysql.format(sqlupdate, [authToken, result[0].authToken])

        bcrypt.compare(password, hashedPassword).then(async (result) => {
          if (result) {
            db1.query(update_query, function (err, result) {
              if (err) throw err;
              sendResponse(200, res, CONFIG.customMessage.LOGIN, authToken);
            });

          }
          else {
            sendResponse(404, res, CONFIG.STATUS_MSG.ERROR.INCORRECT_PASSWORD);
          }
        })
      }
    })
  })
})

app.get("/getUserLists", async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (decode) {
      db1.getConnection(async (err, connection) => {
        const sqlSearch = "SELECT * FROM users"
        const search_query = mysql.format(sqlSearch)
        await connection.query(search_query, async (err, result) => {
          connection.release()
          if (err) {
            sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
          }
          sendResponse(200, res, CONFIG.customMessage.SUCCESS, result, "", 1);
        })

      })
    }

  } catch (e) {
    console.log(e)
    sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
  }
});

app.put("/updatePassword", async (req, res) => {
  try {
    const userName = req.body.userName
    const password = bcrypt.hashSync(req.body.password, parseInt(process.env.SALTROUNDS));
    const token = req.header('Authorization').replace('Bearer ', '');
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    if (decode) {
      db1.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "SELECT * FROM users WHERE userName = ?"
        const search_query = mysql.format(sqlSearch, [userName])
        await connection.query(search_query, async (err, result) => {
          if (err) {
            sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
          }
          if (result.length == 0) {
            connection.release()
            sendResponse(404, res, CONFIG.STATUS_MSG.ERROR.USER_DOESNT_EXISTS);
          }
          else {
            const sqlupdate = "UPDATE users SET password = ? WHERE password = ?"
            const update_query = mysql.format(sqlupdate, [password, result[0].password])
            db1.query(update_query, function (err, result) {
              if (err) {
                sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
              }
              sendResponse(200, res, CONFIG.customMessage.PASSWORD_UPDATED);
            });
          }
        })
      })
    }
  }
  catch (e) {
    console.log(e);
    sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
  }
})

app.delete("/deleteUser", async (req, res) => {
  try {
    const userName = req.body.userName
    const token = req.header('Authorization').replace('Bearer ', '');
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (decode) {
      db1.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "SELECT * FROM users WHERE userName = ?"
        const search_query = mysql.format(sqlSearch, [userName])
        await connection.query(search_query, async (err, result) => {
          if (err) {
            sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
          }
          if (result.length == 0) {
            connection.release()
            sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.USER_DOESNT_EXISTS);
          }
          else {
            const sqldelete = "DELETE FROM users WHERE userName = ?";
            const delete_query = mysql.format(sqldelete, [userName])
            db1.query(delete_query, function (err, result) {
              if (err) {
                sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
              }
              sendResponse(200, res, CONFIG.customMessage.USER_DELETED);
            });
          }
        })

      })
    }
  }
  catch (e) {
    console.log(e);
    sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
  }
})



