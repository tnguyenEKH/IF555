class PDF_file {
	constructor(url, filename, scale = 1.5, pageNum = 1){
		this.url = url;
		this.filename = filename;
		
		this.scale = scale;
		this.pageNum = pageNum;
	}
}



function callReader(pdf_file){
	const url = pdf_file.url,
		  filename = pdf_file.filename;
		  
	let scale = pdf_file.scale,
		pageNum = pdf_file.pageNum;

	let pdfDoc = null,
	  pageIsRendering = false,
	  pageNumIsPending = null;

	let pdfcanvas = document.querySelector('#'+filename+'-pdf-render'),
	//let pdfcanvas = document.createElement("pdfcanvas");
	  ctx = pdfcanvas.getContext('2d');

	// Render the page
	const renderPage = num => {
	  pageIsRendering = true;

	  // Get page
	  pdfDoc.getPage(num).then(page => {
		// Set scale
		const viewport = page.getViewport({ scale });
		
		pdfcanvas.height = viewport.height;
		pdfcanvas.width = viewport.width;
		

		const renderCtx = {
		  canvasContext: ctx,
		  viewport
		};

		page.render(renderCtx).promise.then(() => {
		  pageIsRendering = false;

		  if (pageNumIsPending !== null) {
			renderPage(pageNumIsPending);
			pageNumIsPending = null;
		  }
		});

		// Output current page			
		document.querySelector('#'+filename+'-page-num').textContent = num;
		document.querySelector('#'+filename+'-zoom').textContent = (100*pdf_file.scale).toFixed(0);
	  });
	};

	// Check for pages rendering
	const queueRenderPage = num => {
	  if (pageIsRendering) {
		pageNumIsPending = num;
	  } else {
		renderPage(num);
	  }
	};

	// Show Prev Page
	const showPrevPage = () => {
	  if (pageNum <= 1) {
		return;
	  }
	  pageNum--;
	  pdf_file.pageNum = pageNum;
	  queueRenderPage(pageNum);
	};

	// Show Next Page
	const showNextPage = () => {
	  if (pageNum >= pdfDoc.numPages) {
		return;
	  }
	  pageNum++;
	  pdf_file.pageNum = pageNum;
	  queueRenderPage(pageNum);
	};

	// Zoom out
	const ZoomOut = () => {
	  if (scale <= 0.5) {
		return;
	  }
	  scale -= 0.1;
	  pdf_file.scale = scale;
	  queueRenderPage(pageNum);
	};

	// Zoom in
	const ZoomIn = () => {
	  if (scale >= 2.0) {
		return;
	  }
	  scale += 0.1;
	  pdf_file.scale = scale;
	  queueRenderPage(pageNum);
	};


	// Get Document
	pdfjsLib
	  .getDocument(url)
	  .promise.then(pdfDoc_ => {
		pdfDoc = pdfDoc_;

		document.querySelector('#'+filename+'-page-count').textContent = pdfDoc.numPages;

		renderPage(pageNum);
	  })
	  .catch(err => {
		// Display error
		const div = document.createElement('div');
		div.className = 'error';
		div.appendChild(document.createTextNode(err.message));
		document.querySelector('body').insertBefore(div, canvas);
		// Remove top bar
		document.querySelector('.top-bar').style.display = 'none';
	  });

	// Button Events
	document.querySelector('#'+filename+'-prev-page').addEventListener('click', showPrevPage);
	document.querySelector('#'+filename+'-next-page').addEventListener('click', showNextPage);
	document.querySelector('#'+filename+'-zoom_in').addEventListener('click', ZoomIn);
	document.querySelector('#'+filename+'-zoom_out').addEventListener('click', ZoomOut);
}