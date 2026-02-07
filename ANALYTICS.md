# Website Analytics Documentation
    
    This document outlines the setup and configuration of analytics for [ipv1337.dev](https://ipv1337.dev).
    
    ## 1. Google Analytics 4 (GA4)
    - **Property Name:** ipv1337.dev
    - **Measurement ID:** `G-MN16CB3V3T`
    - **Data Stream:** Web stream for https://ipv1337.dev
    
    ## 2. Implementation
    The global site tag (`gtag.js`) has been manually added to the `<head>` section of `index.html`.
    
    ```html
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MN16CB3V3T"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
    
      gtag('config', 'G-MN16CB3V3T');
    </script>
    ```
    
    ## 3. Integrations
    - **Google Search Console:** Linked to the GA4 property to track search performance and organic traffic.
    - **Status:** Active (Linked as of February 2026).
    
    ## 4. Maintenance
    - Traffic insights can be viewed at [analytics.google.com](https://analytics.google.com).
    - Basic repository traffic stats are available under the "Insights" tab on GitHub.
