const labels = document.querySelectorAll(".inputs > label");
const inputs = document.querySelectorAll("input")
const errorMess = document.querySelectorAll(".error")
const labelTexts = document.querySelectorAll(".label-text");
const emailInput = document.getElementById("username-input");
const passInput = document.getElementById("password-input");
const confirmPassInput = document.getElementById("confirm-password-input");
const changeVisibilityBtn = document.querySelectorAll(".changeVisibility");
const submitButton = document.getElementById("submit-btn");

const numOfError = 0;
let passwordVisibility = false;
let confirmPasswordVisibility = false;

labels.forEach((label, index) => {
    const input = label.querySelector("input");

    input.addEventListener("focus", () => {
        labelTexts[index].classList.add("focus");
    });

    input.addEventListener("blur", () => {
        // Remove class if input is empty
        if (!input.value) {
            labelTexts[index].classList.remove("focus");
        }
    });
});

async function createUser() {
    const email = emailInput.value;
    const password = passInput.value;
    const confirmPassword = confirmPassInput.value;

    if (!email || !password || !confirmPassInput) {
        numOfError += 1;
        if (!email) errorMess[0].innerHTML == "Fill This Form!";
        if (!password) errorMess[1].innerHTML == "Fill This Form!";
        if (!confirmPassword) errorMess[2].innerHTML == "Fill This Form!";
        return;
    }

    if (password != confirmPassword) {
        if (!password) errorMess[1].innerHTML == "The password doesn't match!";
        if (!confirmPassword) errorMess[2].innerHTML == "The password doesn't match!";
        return;
    }

    if (password == confirmPassword) {
        try {
            const response = await fetch("https://earth-production-9ee1.up.railway.app/api/create-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password })
            })

            const getMessage = await response.json();

            if (getMessage?.message) {
                alert(getMessage.message)
                window.location.href = "https://earth-production-9ee1.up.railway.app/login";
            }
        } catch (error) {
            console.log(error)
        }
    }
}

submitButton.addEventListener("click", createUser)
inputs.forEach((e, i) => {
    e.addEventListener("change", () => {
        if (e.value.length <= 7) {
            errorMess[i].innerHTML = "Character length must be greater than 7 characters!"
        } else {
            errorMess[i].innerHTML = ""
        }
    })
})

changeVisibilityBtn.forEach((e, i) => {
    e.addEventListener("click", () => {
        if (i == 0) {
            passwordVisibility = !passwordVisibility;
            const i = e.querySelector("i");
            if(i.classList.contains("fa-eye-slash") && passwordVisibility) {
                i.classList.replace("fa-eye-slash", "fa-eye")
            } else i.classList.replace("fa-eye", "fa-eye-slash")
            passInput.type = passwordVisibility ? "text" : "password";
        } else {
            confirmPasswordVisibility = !confirmPasswordVisibility;
            confirmPassInput.type = confirmPasswordVisibility ? "text" : "password";
        }
    })
})

