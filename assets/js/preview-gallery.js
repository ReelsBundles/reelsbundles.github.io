const previews=[

{
title:"Motivation",
image:"assets/images/preview/motivation.webp",
likes:"1.2M",
views:"5.3M"
},

{
title:"Business",
image:"assets/images/preview/business.webp",
likes:"940K",
views:"3.1M"
},

{
title:"Luxury",
image:"assets/images/preview/luxury.webp",
likes:"2.4M",
views:"7.4M"
},

{
title:"AI",
image:"assets/images/preview/ai.webp",
likes:"820K",
views:"2.8M"
},

{
title:"Travel",
image:"assets/images/preview/travel.webp",
likes:"1.7M",
views:"6.2M"
},

{
title:"Finance",
image:"assets/images/preview/finance.webp",
likes:"980K",
views:"3.9M"
}

];

const gallery=document.getElementById("previewGallery");

if(gallery){

previews.forEach(item=>{

gallery.innerHTML+=`

<div class="preview-card">

<div class="preview-image">

<img
src="${item.image}"
alt="${item.title}">

<div class="play-overlay">

▶

</div>

</div>

<div class="preview-info">

<h3>${item.title}</h3>

<div>

❤️ ${item.likes}

•

👁 ${item.views}

</div>

</div>

</div>

`;

});

}