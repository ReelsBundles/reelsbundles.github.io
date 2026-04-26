<script>
function buyNow(e){
  e.preventDefault(); // page reload rokta hai
  sessionStorage.setItem("reelsAccess","yes");
  window.location.href = e.currentTarget.href;
}</script>
<script>
document.querySelectorAll(".pay-btn").forEach(function(btn) {
  btn.addEventListener("click", function(e) {
    e.preventDefault(); // redirect rokega

    alert("🚧 Website Under Maintenance!\n\nPlease try again later.");
  });
});
</script>
