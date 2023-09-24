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
// app.use('/', require('./routes/auth'));


app.post("/createUser", async (req, res) => {
  const userId = "UID" + "" + Math.floor((Math.random() * 100000000000000) + 1);
  const userName = req.body.userName;
  const password = bcrypt.hashSync(req.body.password, parseInt(process.env.SALTROUNDS));
  const authToken = jwt.sign({ id: userId }, process.env.JWT_SECRET);
  db1.getConnection(async (err, connection) => {
    if (err) throw (err)
    const sqlSearch = "SELECT * FROM users WHERE userName = ?"
    const search_query = mysql.format(sqlSearch, [userName])
    const sqlInsert = "INSERT INTO users VALUES (0,?,?,?,?)"
    const insert_query = mysql.format(sqlInsert, [userId, userName, password, authToken])
    // ? will be replaced by values
    // ?? will be replaced by string
    console.log(insert_query)
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
            //throw (err)
            sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
          }

          sendResponse(200, res, CONFIG.customMessage.USER_CREATED, authToken);

        })
      }
    })
  })
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
    const userId = decode.id
    const sqlSearch2 = "SELECT * FROM users WHERE userId = ?"
    const search_query2 = mysql.format(sqlSearch2, [userId]);
    db1.getConnection(async (err, connection) => {
      await connection.query(search_query2, async (err, result) => {
        if (err) {
          sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
        }
         if (result[0].authToken == token ) {
          db1.getConnection(async (err, connection) => {
            const sqlSearch = "SELECT * FROM users"
            const search_query = mysql.format(sqlSearch)
            await connection.query(search_query, async (err, result) => {
              connection.release()
    
              if (err) throw (err)
              sendResponse(200, res, CONFIG.customMessage.LOGIN, result, "", 1);
            })
    
          })

        } else {
          sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.INVALID_TOKEN);
        }

      })
    })

  } catch (e) {
    sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
  }
});

app.put("/updatePassword", async (req, res) => {
try{
  const userName = req.body.userName
  const password = bcrypt.hashSync(req.body.password, parseInt(process.env.SALTROUNDS));
  const token = req.header('Authorization').replace('Bearer ', '');
  const decode = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decode.id
  const sqlSearch2 = "SELECT * FROM users WHERE userId = ?"
  const search_query2 = mysql.format(sqlSearch2, [userId]);
  db1.getConnection(async (err, connection) => {
    await connection.query(search_query2, async (err, result) => {
      if (err) {
        sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
      }
      if (result[0].authToken == token ) {
        db1.getConnection(async (err, connection) => {
          if (err) throw (err)
          const sqlSearch = "SELECT * FROM users WHERE userName = ?"
          const search_query = mysql.format(sqlSearch, [userName])
          await connection.query(search_query, async (err, result) => {
            if (err) {
              sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
              throw (err)
            }
            if (result.length == 0) {
              connection.release()
              sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.USER_DOESNT_EXISTS);
            }
            else {
              const sqlupdate = "UPDATE users SET password = ? WHERE password = ?"
              const update_query = mysql.format(sqlupdate, [password, result[0].password])
              db1.query(update_query, function (err, result) {
                if (err) throw err;
                sendResponse(200, res, CONFIG.customMessage.PASSWORD_UPDATED);
              });
      
      
            }
          })
      
        })
      }
      else{
        sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.INVALID_TOKEN);
    
      }
    })
  })
  

}
catch(e){
  sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
}
})

app.delete("/deleteUser", async (req, res) => {
  try{
    const userName = req.body.userName
    const token = req.header('Authorization').replace('Bearer ', '');
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decode.id
    const sqlSearch2 = "SELECT * FROM users WHERE userId = ?"
    const search_query2 = mysql.format(sqlSearch2, [userId]);
    db1.getConnection(async (err, connection) => {
      await connection.query(search_query2, async (err, result) => {
        if (err) {
          sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
        }
        if (result[0].authToken == token ) {
          db1.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT * FROM users WHERE userName = ?"
            const search_query = mysql.format(sqlSearch, [userName])
            await connection.query(search_query, async (err, result) => {
              if (err) {
                sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
                throw (err)
              }
              if (result.length == 0) {
                connection.release()
                sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.USER_DOESNT_EXISTS);
              }
              else {
                const sqldelete = "DELETE FROM users WHERE userName = ?";
                const delete_query = mysql.format(sqldelete, [userName])
                db1.query(delete_query, function (err, result) {
                  if (err) throw err;
                  sendResponse(200, res, CONFIG.customMessage.USER_DELETED);
                });
        
        
              }
            })
        
          })
        }
        else{
          sendResponse(401, res, CONFIG.STATUS_MSG.ERROR.INVALID_TOKEN);
        }
      })
    })

  }
  catch(e){
    sendResponse(409, res, CONFIG.STATUS_MSG.ERROR.SOME_ERROR_FOND);
  }
  })





