const labels = document.querySelectorAll(".inputs > label");
const labelTexts = document.querySelectorAll(".label-text");
const inputs = document.querySelectorAll("input");
const emailInput = document.getElementById("username-input");
const passInput = document.getElementById("password-input");
const errorMess = document.querySelectorAll(".error")
const changeVisibilityBtn = document.getElementById("changeVisibility");
const submitButton = document.getElementById("submit-btn");

let passwordVisibility = false;

async function getUserLoggedIn() {
    const email = emailInput.value;
    const password = passInput.value;

    if (!email || !password) {
        numOfError += 1;
        if (!email) errorMess[0].innerHTML == "Fill This Form!";
        if (!password) errorMess[1].innerHTML == "Fill This Form!";
        return;
    }

    try {
        console.log("getResponse!...")
        const response = await fetch("https://earth-production-9ee1.up.railway.app/api/get-logged-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        })

        const getData = await response.json();
        localStorage.setItem("user", JSON.stringify(getData.result))
        console.log(getData.result)
        if (getData?.message) {
            alert(getData.message)
            window.location.href = "https://earth-production-9ee1.up.railway.app/";
        }
    } catch (error) {
        alert(error)
    }
}

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

inputs.forEach((e, i) => {
    e.addEventListener("change", () => {
        if (e.value.length <= 7) {
            errorMess[i].innerHTML = "Character length must be greater than 7 characters!"
        } else {
            errorMess[i].innerHTML = ""
        }
    })
})

changeVisibilityBtn.addEventListener("click", () => {
    passwordVisibility = !passwordVisibility;
    const i = changeVisibilityBtn.querySelector("i");
    if (i.classList.contains("fa-eye-slash") && passwordVisibility) {
        i.classList.replace("fa-eye-slash", "fa-eye")
    } else i.classList.replace("fa-eye", "fa-eye-slash")
    passInput.type = passwordVisibility ? "text" : "password";
})


submitButton.addEventListener("click", getUserLoggedIn)