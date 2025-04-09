import axios from "axios";
import User from "../models/userModel.js";
import FormData from "form-data";

export const generateImage = async (req, res) => {
    try{
        const {userId, prompt} = req.body;

        if(!userId || !prompt){
            return res.status(400).json({
                success: false,
                message: "All the fields are required",
            })
        }

        const user = await User.findById(userId);

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not registered",
            })
        }

        if(user.creditBalance === 0 || User.creditBalance < 0){
            return res.status(400).json({
                success: false,
                message: "Insufficient credit balance",
                Balance: user.creditBalance
            })
        }

        const formData = new FormData();
        formData.append('prompt', prompt);

        const {data} = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
            headers: {
                'x-api-key': process.env.CLIPDROP_API,
            },
            responseType: 'arraybuffer'
        })

        const base64Image = Buffer.from(data, 'binary').toString('base64')
        const resultImage = `data:image/png;base64,${base64Image}`

        await User.findByIdAndUpdate(user._id, {creditBalance: user.creditBalance-1});

        res.status(200).json({
            success: true,
            message: "Image generated successfully",
            creditBalance: user.creditBalance-1,
            resultImage
        })


    }
    catch(err){
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message,
        })
    }
}