/* ==========================================
   HERO INTERACTIONS
========================================== */

const hero = document.querySelector(".hero");
const phone = document.querySelector(".phone");

if(hero && phone){

hero.addEventListener("mousemove",(e)=>{

const rect = hero.getBoundingClientRect();

const x = (e.clientX - rect.left) / rect.width;
const y = (e.clientY - rect.top) / rect.height;

const rotateY = (x-.5)*16;
const rotateX = (.5-y)*16;

phone.style.transform = `
perspective(1200px)
rotateX(${rotateX}deg)
rotateY(${rotateY}deg)
translateY(-12px)
`;

});

hero.addEventListener("mouseleave",()=>{

phone.style.transform=`
perspective(1200px)
rotateX(0)
rotateY(0)
translateY(0)
`;

});

}