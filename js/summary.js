function init() {
  loadName();
}

console.log(auth.currentUser);


async function loadName() {
  let userNameRef = document.getElementById("summary-name");
  userNameRef.innerHTML = "";
  

}


window.addEventListener("load", init);

