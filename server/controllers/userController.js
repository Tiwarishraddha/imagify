import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import razorpay from 'razorpay';
import Transaction from "../models/transactionModel.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please login!",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    const user = await newUser.save();

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      success: true,
      message: "User Registered Successfully",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.log("Error in registerUser:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User is not registered!",
      });
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      return res.status(400).json({
        success: false,
        message: "Incorrect Password",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      success: true,
      message: "User Logged In Successfully",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.log("Error in loginUser:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const userCredits = async (req, res) =>{
    try{
        const {userId} = req.body;

        const user = await User.findById(userId);

        res.status(201).json({
            success: true,
            message: "Credits fetched Successfull",
            credits: user.creditBalance,
            user: {name: user.name}
        })
    }
    catch(err){
        console.log(err.message);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: err.message,
        })

    }
}

export const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const paymentRazorpay = async (req, res) => {
  try {
    const { userId, planId } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let credits, plan, amount;

    switch (planId) {
      case 'Basic':
        plan = 'Basic';
        credits = 100;
        amount = 10;
        break;
      case 'Advanced':
        plan = 'Advanced';
        credits = 500;
        amount = 50;
        break;
      case 'Business':
        plan = 'Business';
        credits = 5000;
        amount = 250;
        break;
      default:
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
    }

    const transactionData = { userId, plan, amount, credits, date: Date.now() };
    const newTransaction = await Transaction.create(transactionData);

    const options = {
      amount: amount * 100, // Razorpay requires amount in paise
      currency: "INR",
      receipt: newTransaction._id,
      // receipt: newTransaction._id.toString(),
    };

    // Await Razorpay order creation
    const order = await razorpayInstance.orders.create(options);

    return res.status(200).json({
      success: true,
      message: "Order Created Successfully",
      order,
    });

  } catch (err) {
    console.log(err.message);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

export const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;

    const order_info = await razorpayInstance.orders.fetch(razorpay_order_id);
    
    if (order_info.status === "paid") {
      const transactionData = await Transaction.findById(order_info.receipt);

      if (!transactionData || transactionData.payment) {
        return res.status(400).json({
          success: false,
          message: "Invalid or duplicate transaction.",
        });
      }

      const userData = await User.findById(transactionData.userId);

      if (!userData) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const newCreditBalance = userData.creditBalance + transactionData.credits;

      // ✅ Ensure credit balance is updated properly
      await User.findByIdAndUpdate(userData._id, { creditBalance: newCreditBalance });
      await Transaction.findByIdAndUpdate(transactionData._id, { payment: true });

      return res.status(200).json({
        success: true,
        message: "Credits Added",
        creditBalance: newCreditBalance,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment Failed",
      });
    }
  } catch (err) {
    console.error("Error in verifying payment:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};