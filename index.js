require("dotenv").config();
const express = require("express");
const cors = require("cors");
const validURL = require("valid-url");
const bodyParser = require("body-parser");
const app = express();

const port = process.env.PORT || 3000;

const { Sequelize, DataTypes } = require("sequelize");
const pg = require("pg");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    dialect: "postgres",
    dialectModule: pg,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialectOptions: {
      ssl: {
        require: true,
      },
    },
  }
);

const Url = sequelize.define("url", {
  original_url: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  short_url: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
});

const connectDatabase = async () => {
  try {
    await sequelize.authenticate({ logging: false });
    await sequelize.sync({ logging: false });
    console.log("Database Connected");
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
};

connectDatabase();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/shorturl/:num", async (req, res) => {
  const num = req.params.num;
  try {
    const url = await Url.findOne({ where: { short_url: num } });
    if (!url) {
      res.status(404).json({ error: "URL not found" });
    } else {
      res.redirect(url.original_url);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/shorturl", async (req, res) => {
  const { url } = req.body;
  if (!validURL.isWebUri(url)) {
    res.status(400).json({ error: "invalid url" });
    return;
  }

  try {
    const count = (await Url.count()) + 1;
    const [newUrl, created] = await Url.findOrCreate({
      where: { original_url: url },
      defaults: { short_url: count },
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const testUrl = `${baseUrl}/api/shorturl/${newUrl.short_url}`;

    res.json({
      original_url: newUrl.original_url,
      short_url: newUrl.short_url,
      test_url: testUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
