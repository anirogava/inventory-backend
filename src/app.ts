import express, { CookieOptions, Router } from "express";
import storeInit from "connect-session-sequelize";
import session, { SessionOptions } from "express-session";
import { sequelize, Session, User } from "./models";
import { CustomSequelizeStore } from "./CustomSequelizeStore";
import { attachRequestUIDMiddleware } from "./utils";
import morgan from "morgan";
import { loggerStream } from "./logger";
import { LoggerLevelEnum } from "./enums/logger-level.enum";
import passport from "passport";
import { configurePassport } from "./passport";
import { hashSync } from "bcrypt";
import { Inventory } from "./models/Inventory";

const SequelizeStore = storeInit(session.Store);
Inventory.initializeModel(sequelize);

const app = express();

const secretKey = "MySecretKey";

const storeOptions = {
  db: sequelize,
  table: "Session",
  extendDefaultFields: Session.extendDefaultFields,
};

const sessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: new CustomSequelizeStore(new SequelizeStore(storeOptions)),
  cookie: <CookieOptions>{
    maxAge: 6 * 30 * 24 * 60 * 60 * 1000, // approximately 6 months
  },
} as SessionOptions;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);

  sessionOptions!.cookie!.secure = true;
}

app.disable("x-powered-by");

app.use(attachRequestUIDMiddleware);
app.use((req, res, next) => {
  morgan("combined", {
    stream: loggerStream(LoggerLevelEnum.http, req.requestUID),
  })(req, res, next);
});
app.use(express.json({}));
app.use(express.urlencoded({ extended: false }));
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

configurePassport(passport);

app.get("/user", (req, res) => {
  res.send(req.user);
});

app.post("/login", (req, res, next) => {
  User.findOne();
  passport.authenticate("local", function (err, user) {
    // if (!user) {
    //   return res.redirect("/protected");
    // }
    // res.redirect("/protected");
    res.send({ success: true });
  })(req, res, next);
});
app.post("/register", (req, res) => {
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    id: req.body.id,
    password: hashSync(req.body.password, 10),
    isActive: req.body.isActive,
  });
  user.save().then((user) => console.log(user));
  res.send({ success: true });
});
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("./login");
});
// app.get("/protected", (req, res) => {
//   // if (req.isAuthenticated()) {
//   //   res.send("protected");
//   // } else {
//   //   res.status(401).send({ msg: "Unauthorized" });
//   // }
//   res.send("protected");
// });

// inventory

app.get("/list", async (req, res) => {
  const list = await Inventory.findAll();
  res.send(list).status(200);
});
app.post("/list", (req, res) => {
  console.log(req.body);

  let inventory = new Inventory({
    name: req.body.name,
    price: req.body.price,
    address: req.body.address,
  });
  inventory.save().then((inventory) => console.log(inventory));
  res.send({ success: true });
});
app.delete("/list/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleteInventory = await Inventory.destroy({
      where: {
        id: id,
      },
    });
    res.status(202).send(`Inventory with an id ${id} is deleted`);
  } catch (err) {
    console.error(err);
  }
});

export default app;
