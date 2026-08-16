const counters = document.querySelectorAll("[data-counter]");

const observer = new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(!entry.isIntersecting) return;

const counter = entry.target;

const target = +counter.dataset.counter;

let value = 0;

const step = Math.ceil(target/120);

const update = ()=>{

value += step;

if(value>=target){

value = target;

}

counter.innerText = target >= 1000
? (value/1000).toFixed(value>=100000?0:1)+"K+"
: value+"%";

if(value<target){

requestAnimationFrame(update);

}

};

update();

observer.unobserve(counter);

});

});

counters.forEach(counter=>observer.observe(counter));