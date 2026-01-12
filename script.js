const getFromLocalStorage = localStorage.getItem("user"); 
const getUser = getFromLocalStorage  ? JSON.parse(getFromLocalStorage) : null;
export let isUserLoggedIn = getUser ? true : false;
const signUpBtn = document.getElementById("signup");
const logInBtn = document.getElementById("login");
const logOutBtn = document.getElementById("logout");

window.onload = () => {
    console.log(getUser, isUserLoggedIn)
    logOutBtn.style.display = isUserLoggedIn ? "block" : "none";
    signUpBtn.style.display = isUserLoggedIn ? "none" : "block";
    logInBtn.style.display = isUserLoggedIn ? "none" : "block";

    console.log(logInBtn, signUpBtn, logOutBtn)
}

logOutBtn.addEventListener("click", () => {
    console.log("hello")
    localStorage.removeItem("user");
})

logOutBtn.querySelector("a").addEventListener("click", () => {
    console.log("hello")
    localStorage.removeItem("user");
})