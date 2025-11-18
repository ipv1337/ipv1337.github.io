const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const root = document.documentElement;

// Function to parse CSS color to RGB array
function colorToRgb(color) {
    if (!color) return [255, 255, 255]; // Default fallback
    if (color.startsWith('#')) {
        const bigint = parseInt(color.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r, g, b];
    } else if (color.startsWith('rgb')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [255, 255, 255];
    }
    // Basic named color handling (add more if needed)
    if (color === 'white') return [255, 255, 255];
    if (color === 'black') return [0, 0, 0];
    return [255, 255, 255];
}

// Function to update RGB CSS variables based on current theme
function updateRgbVariables() {
        const computedStyle = getComputedStyle(root);
        const bgColor = computedStyle.getPropertyValue('--bg-color').trim();
        const accentColor = computedStyle.getPropertyValue('--accent-color').trim();
        
        const bgRgb = colorToRgb(bgColor).join(', ');
        const accentRgb = colorToRgb(accentColor).join(', ');

        root.style.setProperty('--bg-color-rgb', bgRgb);
        root.style.setProperty('--accent-color-rgb', accentRgb);
}

// Function to apply the theme
function applyTheme(theme) {
    if (theme === 'dark') {
        body.classList.add('dark-theme');
    } else {
        body.classList.remove('dark-theme');
    }
    // Update RGB variables after theme change
    updateRgbVariables();
}

// Function to toggle theme and save preference
function toggleTheme() {
        let currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
        let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

// Event listener for the button
themeToggle.addEventListener('click', toggleTheme);

// Apply saved theme on initial load
document.addEventListener('DOMContentLoaded', () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
    applyTheme(savedTheme); // Apply theme first
    
    // Fetch GitHub data
    setupScrollReveal(); // Setup scroll animations
    fetchGitHubProfile();
    fetchGitHubRepos();
    fetchGitHubActivity();
    // Update indicators after all fetches are attempted
    fetchAllGitHubDataAndUpdateIndicators(); 
});

// --- Scroll Reveal Function --- 
function setupScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    const observerOptions = {
        root: null, // relative to document viewport 
        rootMargin: '0px',
        threshold: 0.1 // trigger when 10% of the element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: Unobserve after revealing to save resources
                // observer.unobserve(entry.target);
            }
            // Optional: Remove class if element scrolls out of view (for re-revealing)
            // else {
            //     entry.target.classList.remove('is-visible');
            // }
        });
    }, observerOptions);

    revealElements.forEach(el => {
        observer.observe(el);
    });
}

// --- GitHub Data Fetching Orchestration --- 
async function fetchAllGitHubDataAndUpdateIndicators() {
    console.log('Initiating GitHub data fetches...');

    // Store initial HTML content before potential updates
    captureInitialValues(); 

    // Run all fetch functions concurrently and wait for all to settle
    const results = await Promise.allSettled([
        fetchGitHubProfile(),
        fetchGitHubRepos(),
        fetchGitHubActivity()
    ]);

    console.log('GitHub fetch results:', results);

    // Determine overall status for stats and activity
    const profileResult = results[0];
    const repoResult = results[1];
    const activityResult = results[2];

    let statsStatus = 'failed';
    let statsExpiry = null;
    if (profileResult.status === 'fulfilled' && repoResult.status === 'fulfilled') {
        if (profileResult.value.status === 'live' && repoResult.value.status === 'live') {
            statsStatus = 'live';
        } else if (profileResult.value.status === 'cached' || repoResult.value.status === 'cached') {
            statsStatus = 'cached';
            // Use the earliest expiry time if multiple caches were hit
            statsExpiry = Math.min(
                profileResult.value.expiry || Infinity,
                repoResult.value.expiry || Infinity
            );
        } 
    }

    let activityStatus = activityResult.status === 'fulfilled' ? activityResult.value.status : 'failed';
    let activityExpiry = activityResult.status === 'fulfilled' ? activityResult.value.expiry : null;

    console.log(`Final Status - Stats: ${statsStatus}, Activity: ${activityStatus}`);

    // Update UI indicators (opacity and tooltips)
    updateDataIndicators('stats', statsStatus, statsExpiry);
    updateDataIndicators('activity', activityStatus, activityExpiry);
}

function captureInitialValues() {
        // Capture initial stat values (example for stars)
        const starsElement = document.querySelector('.stat-number[data-stat="stars"]');
        if (starsElement) initialStats.stars = starsElement.textContent;
        
        // Capture initial project details (if needed for better fallback)
        // const projectItems = document.querySelectorAll('#projects .item');
        // projectItems.forEach(item => { ... });
}

function updateDataIndicators(section, status, expiry) {
    const element = document.querySelector(section === 'stats' ? '.github-stats' : '.activity-feed');
    if (!element) return;

    let tooltipText = `GitHub ${section === 'stats' ? 'Stats' : 'Activity'}: `;
    element.classList.remove('data-stale'); // Reset state

    switch (status) {
        case 'live':
            tooltipText += 'Live data.';
            break;
        case 'cached':
            element.classList.add('data-stale');
            tooltipText += 'Cached data';
            if (expiry) {
                const now = new Date().getTime();
                const ageMinutes = Math.round((now - (expiry - 3600000)) / 60000); // Calculate age based on when it was set
                tooltipText += ` (approx. ${ageMinutes} min ago).`;
            } else {
                tooltipText += '.';
            }
            break;
        case 'failed':
        default:
            element.classList.add('data-stale');
            tooltipText += 'Update failed; showing defaults or cached data.';
            break;
    }

    element.setAttribute('title', tooltipText);
}

// GitHub API functions (mostly unchanged, just formatting adjustments)
const githubUsername = 'ipv1337';

async function fetchGitHubProfile() {
    const cacheKey = 'githubProfileData';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        console.log('Using cached GitHub profile data.');
        updateGitHubStats(cachedData);
        return { status: 'cached', data: cachedData };
    }
    
    console.log('Fetching fresh GitHub profile data...');
    try {
        const response = await fetch(`https://api.github.com/users/${githubUsername}`);
        if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
        const data = await response.json();
        updateGitHubStats(data);
        cache.set(cacheKey, data); // Cache the fresh data
        return { status: 'live', data: data };
    } catch (error) {
        console.error('Error fetching GitHub profile:', error);
        // Return status even on failure
        return { status: 'failed', data: null }; 
    }
}

// Helper function to manage cache
const cache = {
    get: (key) => {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        try {
            const item = JSON.parse(itemStr);
            const now = new Date();
            // Check if item expired (e.g., older than 1 hour)
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key); // Remove expired item
                return null;
            }
            // Return both value and expiry time
            return { value: item.value, expiry: item.expiry }; 
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            localStorage.removeItem(key); // Remove corrupted item
            return null;
        }
    },
    set: (key, value, ttl = 3600000) => { // Default TTL: 1 hour (in milliseconds)
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl,
        };
        try {
            localStorage.setItem(key, JSON.stringify(item));
        } catch (e) {
            console.error('Error writing to localStorage:', e);
            // Consider clearing some old cache items if storage is full
        }
    }
};

function updateGitHubStats(data) {
    // Ensure data exists before updating
    if (!data) return;
    
    // Update specific stats, falling back to '...' if data is missing fields
    const statsToUpdate = {
        repos: data.public_repos,
        followers: data.followers,
        following: data.following,
    };

    for (const [key, value] of Object.entries(statsToUpdate)) {
        const element = document.querySelector(`.stat-number[data-stat="${key}"]`);
        // Only update if element exists and value is not undefined/null
        if (element && value !== undefined && value !== null) {
                element.textContent = value;
        } else if (element) {
            element.textContent = '...'; // Show fallback if data missing
        }
    }

        // Update bio if available and element exists
        if (data.bio) {
            const bioElement = document.querySelector('#home p'); // Target hero paragraph
            if (bioElement) bioElement.textContent = data.bio;
        }
        
    // Update GitHub stats summary paragraph
    const connectSummary = document.querySelector('#connect p.text-center');
    if (connectSummary && data.public_repos !== undefined) {
        connectSummary.innerHTML = `You can find me on GitHub where I contribute to various projects and maintain my own <strong>${data.public_repos} public repositories</strong>.`;
    }
}

// Store initial static values from HTML for fallback
const initialStats = {};
const initialProjects = [];

async function fetchGitHubRepos() {
    const cacheKey = 'githubReposData';
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
        console.log('Using cached GitHub repo data.');
        updateFeaturedProjects(cachedResult.value.repos);
        updateGitHubStars(cachedResult.value.totalStars); // Update stars separately
        return { status: 'cached', expiry: cachedResult.expiry, data: cachedResult.value };
    }

    console.log('Fetching fresh GitHub repo data...');
    try {
        // Fetch all public repos to calculate total stars accurately
        let allRepos = [];
        let page = 1;
        while (true) {
            const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?per_page=100&page=${page}`);
            if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
            const repos = await response.json();
            if (repos.length === 0) break;
            allRepos = allRepos.concat(repos);
            page++;
        }

        const totalStars = allRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
        
        const starsElement = document.querySelector('.stat-number[data-stat="stars"]');
        if (starsElement) starsElement.textContent = totalStars;
        
        updateFeaturedProjects(allRepos);

        // Cache the combined results
        const dataToCache = { repos: allRepos, totalStars: totalStars };
        cache.set(cacheKey, dataToCache);
        return { status: 'live', data: dataToCache };

    } catch (error) {
        console.error('Error fetching GitHub repos:', error);
        // Fallback: use initial static values if available
        updateFeaturedProjects(initialProjects);
        updateGitHubStars(initialStats.stars);
        return { status: 'failed', data: null };
    }
}

function updateGitHubStars(totalStars) {
    const starsElement = document.querySelector('.stat-number[data-stat="stars"]');
    if (starsElement) {
        starsElement.textContent = totalStars !== undefined && totalStars !== null ? totalStars : '...';
    }
}

function updateFeaturedProjects(repos) {
    if (!repos || repos.length === 0) return;
    
    // Sort by stars first, then recently updated for tie-breaking
    const sortedRepos = [...repos].sort((a, b) => {
            if (b.stargazers_count !== a.stargazers_count) {
                return b.stargazers_count - a.stargazers_count;
            }
            return new Date(b.updated_at) - new Date(a.updated_at);
        });

    // Filter out forks unless they have significant stars, and get top 2
        const topRepos = sortedRepos.filter(repo => !repo.fork || repo.stargazers_count > 10).slice(0, 2);
    
    const projectsContainer = document.querySelector('#projects .container'); // Target container
    if (!projectsContainer) return;

    const projectItems = projectsContainer.querySelectorAll('.item');

        // Only replace if we found good repos
        if (topRepos.length > 0) {
            topRepos.forEach((repo, index) => {
                if (index < projectItems.length) {
                    const item = projectItems[index];
                    const headingLink = item.querySelector('h3 a');
                    const description = item.querySelector('p'); // First paragraph is description
                    const meta = item.querySelector('.item-meta'); // Select the meta div
                    const tagsContainer = item.querySelector('.tags');

                    if (headingLink) {
                        headingLink.textContent = repo.name;
                        headingLink.href = repo.html_url;
                    }
                    // Ensure description exists before trying to set textContent
                    if (description) {
                            description.textContent = repo.description || 'No description provided.';
                    }
                    
                    // Update Item Meta (ensure meta element exists)
                    // Update Meta (example: repo language or main topic)
                    if (meta && repo.language) {
                        meta.innerHTML = `<i class="fas fa-code"></i> ${repo.language}`;
                    } else if (meta) {
                        // Clear meta if no language
                        meta.innerHTML = '';
                    }

                    if (tagsContainer) {
                        tagsContainer.innerHTML = ''; // Clear existing tags
                        
                        if (repo.language) {
                            const langTag = document.createElement('span');
                            langTag.className = 'tag';
                            langTag.textContent = repo.language;
                            tagsContainer.appendChild(langTag);
                        }
                        
                        // Add stars tag
                        const starsTag = document.createElement('span');
                        starsTag.className = 'tag';
                        starsTag.innerHTML = `<i class="fas fa-star" style="margin-right: 4px;"></i> ${repo.stargazers_count}`;
                        tagsContainer.appendChild(starsTag);
                        
                        // Add forks tag
                        const forksTag = document.createElement('span');
                        forksTag.className = 'tag';
                        forksTag.innerHTML = `<i class="fas fa-code-branch" style="margin-right: 4px;"></i> ${repo.forks_count}`;
                        tagsContainer.appendChild(forksTag);
                    }
                }
            });

            // If fewer than 2 top repos, hide the remaining placeholder(s)
            if (topRepos.length < projectItems.length) {
                for (let i = topRepos.length; i < projectItems.length; i++) {
                    projectItems[i].style.display = 'none';
                }
            }
        } else if (projectItems.length > 0) { // Only add message if placeholders existed
            // If no good repos found, maybe hide the default examples or show a message
            projectItems.forEach(item => item.style.display = 'none');
            const noProjectsMsg = document.createElement('p');
            noProjectsMsg.textContent = "Featured projects from GitHub will appear here.";
            noProjectsMsg.style.textAlign = 'center';
            noProjectsMsg.style.color = 'var(--subtle-text)';
            projectsContainer.appendChild(noProjectsMsg);
        }
}

async function fetchGitHubActivity() {
    const cacheKey = 'githubActivityData';
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
        console.log('Using cached GitHub activity data.');
        updateActivityFeed(cachedResult.value);
        return { status: 'cached', expiry: cachedResult.expiry, data: cachedResult.value };
    }

    console.log('Fetching fresh GitHub activity data...');
    try {
        const response = await fetch(`https://api.github.com/users/${githubUsername}/events/public?per_page=15`); // Fetch a bit more initially
        if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
        const events = await response.json();
        updateActivityFeed(events);
        cache.set(cacheKey, events);
        return { status: 'live', data: events };
    } catch (error) {
        console.error('Error fetching GitHub activity:', error);
        // Fallback: potentially clear the feed or show a message?
        updateActivityFeed([]); // Clear feed on error or show cached if available?
        return { status: 'failed', data: null };
    }
}

function updateActivityFeed(events) {
    if (!events || events.length === 0) return;
    
    const connectContainer = document.querySelector('#connect .container'); // Target container
    if (!connectContainer) return;

    // Find the achievements div to insert after
    const achievementsDiv = connectContainer.querySelector('.achievements');
    if (!achievementsDiv) return; // Cannot insert if anchor element is missing
    
    // Remove existing feed if present
    let existingFeed = connectContainer.querySelector('.activity-feed');
    let existingHeading = connectContainer.querySelector('h3.activity-heading');
    if (existingFeed) existingFeed.remove();
    if (existingHeading) existingHeading.remove();

    // Filter for meaningful events
    const meaningfulEvents = events.filter(event => 
        ['PushEvent', 'PullRequestEvent', 'IssuesEvent', 'CreateEvent', 'ReleaseEvent', 'ForkEvent', 'WatchEvent'].includes(event.type)
    ).slice(0, 5); // Show top 5
    
    // Only create feed if there are events to show
    if (meaningfulEvents.length > 0) {
            // Create heading for the feed
            const heading = document.createElement('h3');
            heading.className = 'text-center activity-heading'; // Add class for potential removal
            heading.style.marginTop = '3em';
            heading.style.marginBottom = '1.5em';
            heading.textContent = 'Recent GitHub Activity';
            
            // Create feed container
            const activityFeed = document.createElement('div');
            activityFeed.className = 'activity-feed';

            // Insert heading and feed after achievements
            achievementsDiv.parentNode.insertBefore(heading, achievementsDiv.nextSibling);
            heading.parentNode.insertBefore(activityFeed, heading.nextSibling);

        meaningfulEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            const date = new Date(event.created_at);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            let icon = 'fas fa-question-circle'; // Default icon
            let actionText = '';
            const repoName = event.repo.name;
            const repoUrl = `https://github.com/${repoName}`;
            let targetUrl = repoUrl; // Default target link

            switch (event.type) {
                case 'PushEvent':
                    icon = 'fas fa-arrow-up';
                        const branch = event.payload.ref.split('/').pop();
                        const commitCount = event.payload.commits?.length || 0;
                    actionText = `Pushed ${commitCount} commit${commitCount !== 1 ? 's' : ''} to <a href="${repoUrl}/tree/${branch}" target="_blank">${repoName}</a>`;
                    break;
                case 'PullRequestEvent':
                    icon = 'fas fa-code-pull-request';
                    const pr = event.payload.pull_request;
                        actionText = `${event.payload.action.charAt(0).toUpperCase() + event.payload.action.slice(1)} pull request <a href="${pr.html_url}" target="_blank">#${pr.number}</a> in <a href="${repoUrl}" target="_blank">${repoName}</a>`;
                    targetUrl = pr.html_url;
                    break;
                case 'IssuesEvent':
                    icon = 'fas fa-circle-exclamation'; // Updated icon
                    const issue = event.payload.issue;
                    actionText = `${event.payload.action.charAt(0).toUpperCase() + event.payload.action.slice(1)} issue <a href="${issue.html_url}" target="_blank">#${issue.number}</a> in <a href="${repoUrl}" target="_blank">${repoName}</a>`;
                    targetUrl = issue.html_url;
                    break;
                case 'CreateEvent':
                    icon = 'fas fa-plus';
                    const refType = event.payload.ref_type;
                    if (refType === 'repository') {
                        actionText = `Created repository <a href="${repoUrl}" target="_blank">${repoName}</a>`;
                    } else if (refType === 'branch' || refType === 'tag') {
                        actionText = `Created ${refType} <strong>${event.payload.ref}</strong> in <a href="${repoUrl}" target="_blank">${repoName}</a>`;
                    } else {
                        actionText = `Created something in <a href="${repoUrl}" target="_blank">${repoName}</a>`;
                    }
                    break;
                case 'ReleaseEvent':
                    icon = 'fas fa-tag';
                    const release = event.payload.release;
                    actionText = `Published release <a href="${release.html_url}" target="_blank">${release.tag_name}</a> for <a href="${repoUrl}" target="_blank">${repoName}</a>`;
                    targetUrl = release.html_url;
                    break;
                case 'ForkEvent':
                        icon = 'fas fa-code-branch'; // Use fork icon
                        const fork = event.payload.forkee;
                        actionText = `Forked <a href="${repoUrl}" target="_blank">${repoName}</a> to <a href="${fork.html_url}" target="_blank">${fork.full_name}</a>`;
                        targetUrl = fork.html_url;
                        break;
                    case 'WatchEvent': // User starred a repo
                        icon = 'fas fa-star';
                        actionText = `Starred repository <a href="${repoUrl}" target="_blank">${repoName}</a>`;
                        break;
            }
            
            item.innerHTML = `                        <div class="activity-icon"><i class="${icon}"></i></div>
                <div class="activity-content">
                    <div class="activity-action">${actionText}</div>
                    <div class="activity-date">${formattedDate}</div>
                </div>
            `;
            
            // Optional: make the whole item clickable
                item.style.cursor = 'pointer';
                item.onclick = () => window.open(targetUrl, '_blank');

            activityFeed.appendChild(item);
        });
    } else {
            // Optional: display message if no recent meaningful activity
            // console.log("No recent meaningful GitHub activity found to display.");
    }
}
