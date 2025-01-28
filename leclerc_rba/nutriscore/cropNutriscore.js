// const headers = {
//   "Content-Type": "application/json",
//   "Authorization": `Bearer ${secret_value('open-ai-key')}`
// };


// Object.entries(context.imageProperties).forEach(entry => {
//   const [key, values] = entry;
//   values.forEach(imageUrl => {
//     content.push({
//       "type": "image_url",
//       "image_url": {
//         "url": imageUrl
//       }
//     });
//   });
// });


// web_request('https://api.openai.com/v1/chat/completions', 'post', payload, headers);

function generateCloudinaryCropUrl(baseUrl, cropHint, defaultWidth, defaultHeight) {
  // Map positions to Cloudinary gravity
  const positionMap = {
    "top-left": "north_west",
    "top-center": "north",
    "top-right": "north_east",
    "middle-left": "west",
    "center": "center",
    "middle-right": "east",
    "bottom-left": "south_west",
    "bottom-center": "south",
    "bottom-right": "south_east",
  };

  // Get the gravity value based on the cropHint
  const gravity = positionMap[cropHint.nutriScoreLocation];
  if (!gravity) {
    return { error: `Invalid nutriScoreLocation: ${cropHint.nutriScoreLocation}` };
  }

  // Split the Cloudinary URL into base and image ID
  const urlParts = baseUrl.split("/upload/");
  if (urlParts.length !== 2) {
    return { error: "Invalid Cloudinary URL. Ensure it contains '/upload/'." };
  }

  // Construct the crop parameters
  const cropParams = `c_crop,g_${gravity},w_${defaultWidth},h_${defaultHeight}`;

  // Generate the transformed URL
  const transformedUrl = `${urlParts[0]}/upload/${cropParams}/${urlParts[1].split("/").pop()}`;

  // Return the transformed URL
  return { transformedUrl };
}

function extractUrlsAndCount(imageProperties) {
  // Initialize an array to hold all URLs
  let allUrls = [];

  // Iterate over all properties in the imageProperties object
  for (const key in imageProperties) {
    if (imageProperties.hasOwnProperty(key)) {
      // Check if the property value is an array
      const urls = imageProperties[key];
      if (Array.isArray(urls)) {
        // Add the URLs from this property to the allUrls array
        allUrls = allUrls.concat(urls);
      }
    }
  }

  // Return the total count and the list of URLs
  return {
    totalUrls: allUrls.length,
    allUrls: allUrls,
  };
}

function main(baseUrl, cropHint) {

  // Step 2: Define default crop dimensions (can adjust dynamically if needed)
  const defaultWidth = 1400; // Adjust based on use case
  const defaultHeight = 1400; // Adjust based on use case

  // Step 3: Generate the Cloudinary crop URL
  const result = generateCloudinaryCropUrl(baseUrl, cropHint, defaultWidth, defaultHeight);

  // Return the result as an object
  return result;
}

const urls = extractUrlsAndCount(context.imageProperties).allUrls;
// Execute
const output = main(urls[0], JSON.parse(context.score_1.choices[0].message.content));
output;

