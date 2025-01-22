const counter = document.getElementById("counter");
counter.value = new Date().toLocaleString();

setInterval(() => {
    counter.value = new Date().toLocaleString();
}, 1000);