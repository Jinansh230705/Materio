
document.addEventListener("DOMContentLoaded", () => {
const toggle = document.getElementById("darkToggle");
const isDark = localStorage.getItem("darkMode") === "true";
if (isDark) document.body.classList.add("dark");

toggle.addEventListener("click", () => {
document.body.classList.toggle("dark");
localStorage.setItem("darkMode", document.body.classList.contains("dark"));
});
});