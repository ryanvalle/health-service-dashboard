import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Helper function to hide elements during PDF generation
 */
const hideElementsForPDF = () => {
  const elements = document.querySelectorAll('.pdf-hide');
  elements.forEach(el => {
    el.dataset.originalDisplay = el.style.display;
    el.style.display = 'none';
  });
};

/**
 * Helper function to restore hidden elements after PDF generation
 */
const restoreElementsAfterPDF = () => {
  const elements = document.querySelectorAll('.pdf-hide');
  elements.forEach(el => {
    el.style.display = el.dataset.originalDisplay || '';
    delete el.dataset.originalDisplay;
  });
};

/**
 * Export a single element to PDF
 * @param {HTMLElement} element - The DOM element to export
 * @param {string} filename - The name of the PDF file
 * @param {Object} options - Additional options for PDF generation
 */
export const exportToPDF = async (element, filename = 'export.pdf', options = {}) => {
  if (!element) {
    console.error('Element not found for PDF export');
    return;
  }

  try {
    // Hide elements that shouldn't be in PDF
    hideElementsForPDF();

    // Wait a bit for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      ...options.html2canvasOptions
    });

    // Restore hidden elements
    restoreElementsAfterPDF();

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      ...options.jsPDFOptions
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(filename);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Restore elements in case of error
    restoreElementsAfterPDF();
    throw error;
  }
};

/**
 * Export multiple elements to a multi-page PDF
 * @param {Array<HTMLElement>} elements - Array of DOM elements to export (one per page)
 * @param {string} filename - The name of the PDF file
 * @param {Object} options - Additional options for PDF generation
 */
export const exportMultiPageToPDF = async (elements, filename = 'export.pdf', options = {}) => {
  if (!elements || elements.length === 0) {
    console.error('No elements found for PDF export');
    return;
  }

  try {
    // Hide elements that shouldn't be in PDF
    hideElementsForPDF();

    // Wait a bit for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      ...options.jsPDFOptions
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (!element) continue;

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ...options.html2canvasOptions
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Add new page for subsequent elements
      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    }

    // Restore hidden elements
    restoreElementsAfterPDF();

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Restore elements in case of error
    restoreElementsAfterPDF();
    throw error;
  }
};

/**
 * Export dashboard to PDF
 * @param {string} filename - The name of the PDF file
 */
export const exportDashboardToPDF = async (filename = 'dashboard.pdf') => {
  const dashboardElement = document.querySelector('.dashboard');
  if (!dashboardElement) {
    console.error('Dashboard element not found');
    return;
  }

  return exportToPDF(dashboardElement, filename);
};

/**
 * Export endpoint detail to multi-page PDF
 * First page: summary and charts
 * Subsequent pages: paginated check history
 * @param {string} filename - The name of the PDF file
 */
export const exportEndpointDetailToPDF = async (filename = 'endpoint-detail.pdf') => {
  // Get the main sections
  const detailHeader = document.querySelector('.detail-header');
  const detailInfo = document.querySelector('.detail-info');
  const chartsSection = document.querySelector('.charts-section');
  const historySection = document.querySelector('.history-section');

  if (!detailHeader) {
    console.error('Endpoint detail elements not found');
    return;
  }

  try {
    // Hide elements that shouldn't be in PDF
    hideElementsForPDF();
    await new Promise(resolve => setTimeout(resolve, 100));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Create a temporary container for the first page content
    const tempContainer = document.createElement('div');
    tempContainer.style.padding = '20px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.width = '1200px';
    
    // Clone and add sections to temp container
    if (detailHeader) {
      const headerClone = detailHeader.cloneNode(true);
      // Remove action buttons from clone
      const actionsDiv = headerClone.querySelector('.detail-actions');
      if (actionsDiv) actionsDiv.remove();
      tempContainer.appendChild(headerClone);
    }
    
    if (detailInfo) {
      tempContainer.appendChild(detailInfo.cloneNode(true));
    }
    
    if (chartsSection) {
      tempContainer.appendChild(chartsSection.cloneNode(true));
    }

    // Add temp container to body temporarily
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    // Capture first page (summary + charts)
    const firstPageCanvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Remove temp container
    document.body.removeChild(tempContainer);

    // Add first page to PDF
    const imgData = firstPageCanvas.toDataURL('image/png');
    const imgWidth = firstPageCanvas.width;
    const imgHeight = firstPageCanvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);

    // Now handle check history on subsequent pages
    if (historySection) {
      const historyItems = historySection.querySelectorAll('.history-item');
      
      if (historyItems.length > 0) {
        // Group history items for pagination (e.g., 3 items per page)
        const itemsPerPage = 3;
        const pages = Math.ceil(historyItems.length / itemsPerPage);

        for (let page = 0; page < pages; page++) {
          pdf.addPage();
          
          const pageContainer = document.createElement('div');
          pageContainer.style.padding = '20px';
          pageContainer.style.backgroundColor = '#ffffff';
          pageContainer.style.width = '1200px';
          
          // Add title for history section
          const historyTitle = document.createElement('h2');
          historyTitle.textContent = `Check History (Page ${page + 1} of ${pages})`;
          historyTitle.style.marginBottom = '20px';
          historyTitle.style.fontSize = '24px';
          pageContainer.appendChild(historyTitle);

          // Add items for this page
          const startIdx = page * itemsPerPage;
          const endIdx = Math.min(startIdx + itemsPerPage, historyItems.length);
          
          for (let i = startIdx; i < endIdx; i++) {
            const itemClone = historyItems[i].cloneNode(true);
            // Remove buttons from history items
            const buttons = itemClone.querySelectorAll('button');
            buttons.forEach(btn => btn.remove());
            pageContainer.appendChild(itemClone);
          }

          // Add to body temporarily
          pageContainer.style.position = 'absolute';
          pageContainer.style.left = '-9999px';
          document.body.appendChild(pageContainer);

          // Capture page
          const pageCanvas = await html2canvas(pageContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });

          // Remove temp container
          document.body.removeChild(pageContainer);

          // Add to PDF
          const pageImgData = pageCanvas.toDataURL('image/png');
          const pageImgWidth = pageCanvas.width;
          const pageImgHeight = pageCanvas.height;
          const pageRatio = Math.min(pdfWidth / pageImgWidth, pdfHeight / pageImgHeight);
          
          pdf.addImage(pageImgData, 'PNG', 0, 0, pageImgWidth * pageRatio, pageImgHeight * pageRatio);
        }
      }
    }

    // Restore hidden elements
    restoreElementsAfterPDF();

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating endpoint detail PDF:', error);
    restoreElementsAfterPDF();
    throw error;
  }
};
