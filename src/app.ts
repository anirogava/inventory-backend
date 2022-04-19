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
import { InventoryRepository } from "./repositories/inventorys.repository";
import { DailyRotateFileTransportOptions } from "winston/lib/winston/transports";

const SequelizeStore = storeInit(session.Store);
Inventory.initializeModel(sequelize);

const app = express();

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

const api = Router();

api.get("/user", (req, res) => {
  res.send(req.user);
});

api.post("/login", passport.authenticate("local"), (req, res, next) => {
  res.send({ message: "ok" });
});
api.post("/register", async (req, res) => {
  try {
    const user = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashSync(req.body.password, 10),
      isActive: true,
    });
  } catch (er: any) {
    console.log(er);
  }

  // console.log(user);

  res.send({ success: true });
});
api.get("/logout", (req, res) => {
  req.logout();
  res.redirect("./login");
});
api.get("/protected", (req, res) => {
  if (req.isAuthenticated()) {
    res.send("protected");
  } else {
    res.status(401).send({ msg: "Unauthorized" });
  }
  res.send("protected");
});

// inventory

api.get("/list", async (req, res) => {
  const items = await new InventoryRepository().getList(
    parseInt(<string>req.query.offset),
    parseInt(<string>req.query.limit),
    <{}>JSON.parse(<string>req.query.filters)
  );
  console.log(req.query.filters);

  const count = await Inventory.count();
  res.send({ count, items }).status(200);
});

api.post("/list", (req, res) => {
  let inventory = new Inventory({
    name: req.body.name,
    price: req.body.price,
    address: req.body.address,
    userId: req.body.userId,
  });
  inventory.save().then((inventory) => console.log(inventory));
  res.send({ success: true });
});
api.delete("/list/:id", async (req, res) => {
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

app.use("/api", api);

export default app;
