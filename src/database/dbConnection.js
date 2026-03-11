import mongoose from "mongoose";
import {ENV} from "../config/envConfig.js";

const connectDB = async () => {

  try {
    const connectionInstance = await mongoose.connect(
      `${ENV.MONGODB_URI}/${ENV.DB_NAME}`
    );
    console.log(`\n MongoDB connected !: 
        ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log("MongoDB Connection Faild",error);
    process.exit(1);
  }
};

export default connectDB;
