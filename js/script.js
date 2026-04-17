<script>
function buyNow(e){
  e.preventDefault(); // page reload rokta hai
  sessionStorage.setItem("reelsAccess","yes");
  window.location.href = e.currentTarget.href;
}</script>
