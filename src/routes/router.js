import express from 'express'
import userRouter from "../routes/userRoute.js";
import logRouter from "../routes/logRoute.js";
import captchaRouter from "../routes/captchaRoute.js";
import prakoshthRouter from "../routes/prakoshthRoute.js";
import multiRouter from "../routes/multiRouter.js";
import memberRouter from "../routes/memberRoute.js";

const routers = express.Router()


routers.use("/v1/users", userRouter);
routers.use("/v1/logs-dashboard", logRouter);
routers.use("/v1/captcha", captchaRouter);
routers.use("/v1/prakoshth",prakoshthRouter)
routers.use("/v1/multi", multiRouter);
routers.use("/v1/member", memberRouter);

export default routers;