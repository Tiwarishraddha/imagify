import axios from "axios";
import {createContext, useEffect, useState} from "react"
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";


export const AppContext = createContext()

const AppContextProvider = (props) => {
    const [user,setUser] = useState(null);
    const [showLogin, setShowLogin] = useState(false);

    const [token, setToken] = useState(localStorage.getItem('token'));
    const [credit, setCredit] = useState(false);


    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const navigate = useNavigate();

    const loadCreditsData = async ()=>{
        try{
            const {data} = await axios.get(backendUrl + '/api/user/credits', {headers: {token}});

            if(data.success){
                setCredit(data.credits);
                setUser(data.user);
            }
        }
        catch(err){
            console.log(err);
            toast.error(err.message);
        }
    }

    const generateImage = async (prompt) => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/image/generate-image',
                { prompt },
                { headers: { token } }
            );
    
            if (data.success) {
                loadCreditsData();
                return data.resultImage;
            } else {
                toast.error(data.message || "An error occurred while generating the image.");
                loadCreditsData();
                
                if (data.creditBalance === 0) {
                    toast.error("You have no credits left. Please purchase more credits.");
                    navigate('/buy');
                }
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                toast.error(err.response.data.message); // Show actual backend error message
            } else {
                toast.error("An unexpected error occurred. Please try again.");
            }
        }
    };

    const logout = () =>{
        localStorage.removeItem('token');
        setToken('');
        setUser(null);
    }

    useEffect(()=>{
        if(token){
            loadCreditsData();
        }
    }, [token])

    const value = {
        user, setUser, showLogin, setShowLogin, backendUrl, token, setToken, credit, setCredit, loadCreditsData, logout, generateImage
    }

    return (
        <AppContext.Provider value={value}>
            {props.children }
        </AppContext.Provider>
    )
}
export default AppContextProvider