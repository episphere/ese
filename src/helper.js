export function euclideanDistance(pointA, pointB) {
  if (pointA.length !== pointB.length) {
    throw new Error("Points must have the same dimensions");
  }

  return Math.sqrt(
    pointA
      .map((coord, index) => Math.pow(coord - pointB[index], 2))
      .reduce((sum, squaredDiff) => sum + squaredDiff, 0)
  );
}

export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0; 
  }

  return dotProduct / (magnitudeA * magnitudeB);
}


export async function embedGemini(text, key, model="models/text-embedding-004") {
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${key}`

  if (key == null) {
    throw Error("No Gemini API key supplied.");
  } 
  
  const result = await fetch(url, {
    method:'POST',
    headers:{
      'Content-Type': 'application/json',
    },
    body:JSON.stringify(embeddingRequest(text))
  })

  return await result.json()
}

function embeddingRequest(text, model="models/text-embedding-004") {
  return {
    model,
    content: {
      parts: [ { text }]
    }
  }
}

export function hookDropdownButton(element, state, valueProperty, optionsProperty) {
  let button;
  if (typeof element == "string") {
    button = document.querySelector(selector);
    if (button == null) {
      throw new Error(`No element found for ${selector}`);
    }
  } else {
    button = element;
  }

  const dropdownContainer = document.createElement("div");
  dropdownContainer.className = "dropdown";
  button.replaceWith(dropdownContainer);
  button.setAttribute("data-bs-toggle", "dropdown");

  const list = document.createElement("div");
  list.className = "dropdown-menu";

  dropdownContainer.appendChild(button);
  dropdownContainer.appendChild(list);

  let options;

  function setOptions() {
    if (state[optionsProperty]) {
      options = state[optionsProperty].map((d) =>
        typeof d == "string" ? { label: d, value: d } : d
      );

      list.innerHTML = '';
      for (const option of options) {    
        const link = document.createElement("a");
        link.style.cursor = "pointer";
        // link.setAttribute("href", "#");
        link.innerText = option.label;
        link.classList.add("dropdown-item", "cursor-pointer");
        if (option.value == state[valueProperty]) {
          link.classList.add("active");
        }

        link.addEventListener("click", () => {
          state[valueProperty] = option.value;
        });

        list.appendChild(link);
        option.element = link;
      }
    }
  }

  state.subscribe(optionsProperty, () => {
    setOptions();
  });

  state.subscribe(valueProperty, () => {
    options.forEach(option => {
      if (option.value == state[valueProperty]) {
        option.element.classList.add("active");
      } else {
        option.element.classList.remove("active");
      }
    });
  });
}

export function createDropdownButton(button, dropdownOptions, options={}) {
  const dropdownContainer = document.createElement("div");
  dropdownContainer.className = "dropdown";

  button.replaceWith(dropdownContainer);

  // Adding Bootstrap toggle attribute
  button.setAttribute("data-bs-toggle", "dropdown");

  // Add class for cursor change
  // button.classList.add("dropdown-toggle", "cursor-pointer");

  const list = document.createElement("ul");
  list.className = "dropdown-menu";

  if (options.header) {
    const headerElement = document.createElement("h6");
    headerElement.className = "dropdown-header";
    headerElement.innerText =options.header;
    list.appendChild(headerElement);
  }

  // Loop through the options to create dropdown items
  for (const option of dropdownOptions) {
    const item = document.createElement("li");

    const link = document.createElement("a");
    link.innerText = option.text;
    link.classList.add("dropdown-item", "cursor-pointer");
    item.appendChild(link);

    // Pass the event to the callback when the item is clicked
    if (option.callback) {
      item.addEventListener("click", (event) => option.callback(event));
    }

    if (option.id) {
      item.setAttribute("id", option.id);
    }

    list.appendChild(item);
  }

  dropdownContainer.appendChild(button);
  dropdownContainer.appendChild(list);

  return dropdownContainer;
}
