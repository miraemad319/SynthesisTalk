// axios.js in api folder
import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8000",  // Your backend base URL
  timeout: 10000,                    // optional timeout
});

export default instance;
