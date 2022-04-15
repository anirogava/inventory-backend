import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { ApiError } from "./errors/api-error";
import { IRedisService, RedisService } from "./services/redis.client";
import {
  IUserRepository,
  UserRepository,
} from "./repositories/users.repository";
import { User } from "./models";

const UNSUCCESSFUL_LOGIN_LIMIT = 5;

function loginIsDisabled(unsuccessfulLoginCount: number): boolean {
  return unsuccessfulLoginCount >= UNSUCCESSFUL_LOGIN_LIMIT;
}

export function configurePassport(
  passport: passport.PassportStatic,
  userRepository: IUserRepository = new UserRepository(),
  redisService: IRedisService = new RedisService()
) {
  passport.serializeUser(function (user, done) {
    done(null, (user as User).id);
  });

  passport.deserializeUser(function (id: string, done) {
    userRepository
      .getById(id)
      .then((user) => done(null, user))
      .catch(done);
  });

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true,
      },
      function (req, email, password, done) {
        userRepository
          .getUserByEmail(email.toLowerCase().replace(/\s/g, ""))
          .then(async (user) => {
            if (!user)
              return done(
                new ApiError("incorrect email or password", 400),
                false
              );
            let unsuccessfulLoginCount =
              await redisService.getUnsuccessfulLoginCount(user.id);

            if (loginIsDisabled(unsuccessfulLoginCount)) {
              return done(
                new ApiError(
                  "the maximum number of login attempts has been exceeded",
                  429
                ),
                false
              );
            }

            return user.isValidPassword(password).then(async (isValid) => {
              if (!isValid) {
                unsuccessfulLoginCount++;
                await redisService.setUnsuccessfulLoginCount(
                  user.id,
                  unsuccessfulLoginCount,
                  loginIsDisabled(unsuccessfulLoginCount)
                );
                return done(
                  new ApiError("incorrect email or password", 400),
                  false
                );
              }

              if (unsuccessfulLoginCount) {
                await redisService.deleteUnsuccessfulLoginCount(user.id);
              }

              done(null, user);
            });
          })
          .catch(done);
      }
    )
  );
}
