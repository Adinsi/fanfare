require("dotenv").config({ path: "./config/.env" });
require("./config/db");
const express = require("express");
const app = express();
const cors = require("cors");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const userRoute = require("./routes/user.routes");
const userPartition = require("./routes/partition.routes");
const rate_limiter = require("./utils/rate.limiter");
const helmet = require("helmet");
const path = require("path");
const session = require("express-session");
// const firewall = require("node-firewall");
require("./test/test");
const cron = require("node-cron");
const User = require("./modeles/user");

const moment = require("moment-timezone");

// Définir le fuseau horaire souhaité
const timezone = "Africa/Porto-Novo"; // Fuseau horaire du Bénin

// Environnement variable
const port = process.env.PORT;
const origineClient = process.env.CLIENT_URL;

cron.schedule(
  "20 12 * * 4",
  async () => {
    // Mettez à jour l'objet idVerified pour ous les utilisateurs les Mercredi à 21h30
    try {
      await User.updateMany({}, { heure: "", status: "" });
      console.log("Mise à jour réussie!");
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  },
  {
    timezone: "Africa/Porto-Novo", // ajuster le fuseau horaire en fonction de votre localisation
  }
);
// définition de la tâche planifiée
cron.schedule(
  "00 21 * * 1",
  () => {
    User.updateMany(
      { status: { $in: ["", null] } }, //filtre pour sélectionner les utilisateurs avec isVerified vide ou null
      { $set: { status: "Absent", heure: "P ou I" } } //objet de mise à jour - ici on met le champ isVerified à 'Absent'
    )
      .then((result) => {
        console.log(result.nModified + " utilisateurs mis à jour");
      })
      .catch((err) => {
        console.log("Erreur lors de la mise à jour des utilisateurs", err);
      });
  },
  {
    timezone: "Africa/Porto-Novo", // ajuster le fuseau horaire en fonction de votre localisation
  }
);

// Fonction pour initialiser le champ "average" de tous les utilisateurs à une valeur vide
const initializeUsersAverage = async () => {
  try {
    // Code pour initialiser le champ "average" de tous les utilisateurs à une valeur vide
    const users = await User.find();
    for (const user of users) {
      user.average = "";
      await user.save();
    }
    console.log(
      'Le champ "average" a été initialisé à une valeur vide pour tous les utilisateurs.'
    );
  } catch (err) {
    console.error('Erreur lors de l\'initialisation du champ "average" :', err);
  }
};

// Tâche de cron pour initialiser le champ "average" à une valeur vide tous les mois (le dimanche à minuit)

// cron.schedule("0 0 1 * *", initializeUsersAverage);
// console.log("La tâche d'initialisation a été planifiée.");

// app.use(cookieParser()); //Lire les cookies
app.use(rate_limiter(100, 60000)); //Limiter les réquêtes abusées
app.use(cors({ credentials: true, origin: origineClient })); //L'origine des requêtes
app.use(bodyParser.json()); //Transformer nos corps en json
app.use(bodyParser.urlencoded({ extended: true }));

// Own routes..
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "./client/build/index.html"));
// });
// app.use(express.static(path.join(__dirname, "./client/build/image/user")));
app.use(express.static(path.join(__dirname, "./client/build")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});

app.get("/register", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/login", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/home", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});

app.get("/politique", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/partition", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/partition/:id", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/carte", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/profil", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/forget", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/reset/:token", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/notification", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/education", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/validation", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/transaction", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/admin", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/admin/home-users", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/admin/home-validate", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/admin/home-liste", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.get("/admin/home-note", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build", "index.html"));
});
app.use("/api/partition", userPartition);
app.use("/api/user", userRoute);

app.listen(port || 7500, () =>
  console.log(`Le serveur est démarrer sur le port ${port}`)
);
