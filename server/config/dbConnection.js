import mongoose from "mongoose";


async function connectDB() {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB Connection Successfull");
    }
    catch(err){
        console.log("DB Connection Unsuccessfull");
        process.exit(1);
    }
}
export default connectDB;