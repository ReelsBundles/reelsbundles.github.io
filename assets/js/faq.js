/* ==========================================
FAQ
========================================== */

const faqItems=document.querySelectorAll(".faq-item");

faqItems.forEach(item=>{

const question=item.querySelector(".faq-question");

question.addEventListener("click",()=>{

faqItems.forEach(f=>{

if(f!==item){

f.classList.remove("active");

}

});

item.classList.toggle("active");

});

});