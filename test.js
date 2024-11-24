import pdf2image from 'pdf2image';

pdf2image.convertPDF('example.pdf').then(
  function(pageList){
      console.log(pageList);
  }
  ).catch(err => {
    console.log(err);
  }
);