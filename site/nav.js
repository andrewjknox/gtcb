/* GTCB shared nav — mobile burger toggle. Loaded by all pages. */
(function () {
  "use strict";
  var btn = document.querySelector(".nav-burger");
  var links = document.getElementById("nav-links");
  if (!btn || !links) return;

  function setOpen(open) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    links.classList.toggle("open", open);
  }

  btn.addEventListener("click", function () {
    setOpen(btn.getAttribute("aria-expanded") !== "true");
  });

  // Close the menu once a destination is chosen.
  links.addEventListener("click", function (e) {
    var t = e.target;
    while (t && t !== links) {
      if (t.tagName === "A") { setOpen(false); return; }
      t = t.parentNode;
    }
  });

  // Escape closes the menu and returns focus to the button.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      btn.focus();
    }
  });
})();
