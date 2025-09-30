#!/usr/bin/env python3
"""
Kosuke Template Interactive Setup Guide
======================================

This interactive script guides you through setting up the kosuke template infrastructure
step-by-step, with a mix of manual guidance and automated setup:

1. GitHub Repository (Manual) - Fork repository manually with guidance
2. Vercel Project (Automated) - Auto-create project + storage with API token
3. Neon Database (Manual) - Complete integration through Vercel marketplace
4. Polar Billing (Automated) - Auto-create organization + products with API token  
5. Clerk Authentication (Manual) - Create application + configure OAuth manually

Progress is saved automatically, so you can resume if interrupted.
"""

import os
import sys
import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
import re

import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
KOSUKE_REPO_URL = "https://github.com/filopedraz/kosuke-template"
KOSUKE_REPO_OWNER = "filopedraz"
KOSUKE_REPO_NAME = "kosuke-template"
PROGRESS_FILE = ".kosuke-setup-progress.json"

@dataclass
class ServiceConfig:
    """Configuration for a created service"""
    name: str
    url: str
    credentials: Dict[str, str]
    webhook_urls: List[str] = None

    def to_dict(self):
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data):
        return cls(**data)

@dataclass
class SetupProgress:
    """Tracks setup progress"""
    current_step: int = 1
    project_name: str = ""
    completed_services: List[str] = None
    api_keys: Dict[str, str] = None
    service_configs: Dict[str, Dict] = None
    
    def __post_init__(self):
        if self.completed_services is None:
            self.completed_services = []
        if self.api_keys is None:
            self.api_keys = {}
        if self.service_configs is None:
            self.service_configs = {}
    
    def to_dict(self):
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data):
        return cls(**data)

class Colors:
    """Console colors for better UX"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_success(message: str):
    print(f"{Colors.OKGREEN}✅ {message}{Colors.ENDC}")

def print_error(message: str):
    print(f"{Colors.FAIL}❌ {message}{Colors.ENDC}")

def print_warning(message: str):
    print(f"{Colors.WARNING}⚠️  {message}{Colors.ENDC}")

def print_info(message: str):
    print(f"{Colors.OKCYAN}ℹ️  {message}{Colors.ENDC}")

def print_step(step: int, total: int, title: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}📍 Step {step}/{total}: {title}{Colors.ENDC}")
    print("=" * 60)

class ProgressManager:
    """Manages setup progress saving and loading"""
    
    @staticmethod
    def save_progress(progress: SetupProgress):
        """Save progress to file"""
        try:
            with open(PROGRESS_FILE, 'w') as f:
                json.dump(progress.to_dict(), f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save progress: {e}")
    
    @staticmethod
    def load_progress() -> Optional[SetupProgress]:
        """Load progress from file"""
        try:
            if os.path.exists(PROGRESS_FILE):
                with open(PROGRESS_FILE, 'r') as f:
                    data = json.load(f)
                return SetupProgress.from_dict(data)
        except Exception as e:
            logger.error(f"Failed to load progress: {e}")
        return None
    
    @staticmethod
    def clear_progress():
        """Clear progress file"""
        try:
            if os.path.exists(PROGRESS_FILE):
                os.remove(PROGRESS_FILE)
        except Exception as e:
            logger.error(f"Failed to clear progress: {e}")

class ServiceManager:
    """Base class for service managers"""
    
    def __init__(self, name: str):
        self.name = name
        self.session = requests.Session()
        

        

class InteractiveSetup:
    """Main interactive setup coordinator"""
    
    def __init__(self):
        self.progress = ProgressManager.load_progress() or SetupProgress()
        self.total_steps = 8
    
    def start(self):
        """Start or resume the interactive setup"""
        self.print_banner()
        
        # Check if resuming
        if self.progress.current_step > 1:
            if self.ask_resume():
                print_info(f"Resuming from Step {self.progress.current_step}")
            else:
                print_info("Starting fresh setup...")
                self.progress = SetupProgress()
                ProgressManager.clear_progress()
        else:
            self.progress = SetupProgress()
            ProgressManager.clear_progress()
        
        # Get project name if not set
        if not self.progress.project_name:
            self.progress.project_name = self.get_project_name()
            ProgressManager.save_progress(self.progress)
        
        # Execute steps
        while self.progress.current_step <= self.total_steps:
            if self.progress.current_step == 1:
                self.step_1_github_manual()
            elif self.progress.current_step == 2:
                self.step_2_vercel_manual()
            elif self.progress.current_step == 3:
                self.step_3_neon_manual()
            elif self.progress.current_step == 4:
                self.step_polar_billing()
            elif self.progress.current_step == 5:
                self.step_5_clerk_manual()
            elif self.progress.current_step == 6:
                self.step_6_resend_manual()
            elif self.progress.current_step == 7:
                self.step_7_sentry_manual()
            elif self.progress.current_step == 8:
                self.step_8_vercel_env_vars()
            
            self.progress.current_step += 1
            ProgressManager.save_progress(self.progress)
        
        # Generate .env and complete setup
        self.generate_env_file()
        self.print_completion_summary()
        ProgressManager.clear_progress()
    
    def print_banner(self):
        """Print the application banner"""
        banner = f"""
{Colors.HEADER}{Colors.BOLD}
╔══════════════════════════════════════════════════════════════╗
║            🤖 KOSUKE TEMPLATE INTERACTIVE SETUP 🤖           ║
║                                                              ║
║  Step-by-step guided setup with progress saving:            ║
║  1. GitHub Repository (Manual guided fork)                  ║
║  2. Vercel Project (Manual guided setup)                    ║
║  3. Neon Database (Manual guided setup)                     ║
║  4. Polar Billing (Manual product creation)                 ║
║  5. Clerk Authentication (Manual app creation)              ║
║  6. Resend Email Service (Manual API key setup)             ║
║  7. Sentry Error Monitoring (Manual project creation)       ║
║  8. Vercel Environment Variables (Critical for deployment)  ║
╚══════════════════════════════════════════════════════════════╝
{Colors.ENDC}
        """
        print(banner)
    
    def ask_resume(self) -> bool:
        """Ask user if they want to resume previous setup"""
        print_warning(f"Found previous setup in progress (Step {self.progress.current_step})")
        print_info(f"Project: {self.progress.project_name}")
        print_info(f"Completed: {', '.join(self.progress.completed_services)}")
        
        while True:
            resume = input(f"{Colors.OKCYAN}Resume previous setup? (y/n): {Colors.ENDC}").strip().lower()
            if resume in ['y', 'yes']:
                return True
            elif resume in ['n', 'no']:
                return False
            print_error("Please enter 'y' or 'n'")
    
    def get_project_name(self) -> str:
        """Get project name from user"""
        print_info("Let's start by choosing a project name!")
        print()
        print(f"{Colors.BOLD}📋 Project name format (kebab-case):{Colors.ENDC}")
        print(f"   • Use lowercase letters, numbers, and hyphens only")
        print(f"   • Examples: {Colors.OKCYAN}open-idealista{Colors.ENDC}, {Colors.OKCYAN}my-awesome-app{Colors.ENDC}, {Colors.OKCYAN}startup-mvp{Colors.ENDC}")
        print(f"   • This will be your GitHub repository name and Vercel project name")
        print()
        
        while True:
            project_name = input(f"{Colors.OKCYAN}Enter your project name (kebab-case): {Colors.ENDC}").strip()
            if project_name:
                # Convert to kebab-case
                project_name = project_name.lower().replace(' ', '-').replace('_', '-')
                # Remove special characters except hyphens
                project_name = re.sub(r'[^a-z0-9-]', '', project_name)
                # Remove leading/trailing hyphens and multiple consecutive hyphens
                project_name = re.sub(r'^-+|-+$', '', project_name)
                project_name = re.sub(r'-+', '-', project_name)
                
                if project_name and not project_name.startswith('-') and not project_name.endswith('-'):
                    print_success(f"Project name: {project_name}")
                    return project_name
            print_error("Please enter a valid project name in kebab-case format (e.g., 'open-idealista')")
    
    def step_1_github_manual(self):
        """Step 1: Manual GitHub repository fork"""
        print_step(1, self.total_steps, "GitHub Repository (Manual)")
        
        print_info("We'll guide you through forking the Kosuke template repository.")
        print()
        
        print(f"{Colors.BOLD}📋 Instructions:{Colors.ENDC}")
        print(f"1. Open this URL in your browser: {Colors.OKBLUE}{KOSUKE_REPO_URL}{Colors.ENDC}")
        print(f"2. Click the {Colors.BOLD}'Fork'{Colors.ENDC} button in the top-right corner")
        print(f"3. {Colors.WARNING}Important:{Colors.ENDC} Change the repository name to: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"4. Click {Colors.BOLD}'Create fork'{Colors.ENDC}")
        print(f"5. Wait for the fork to complete")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've completed the fork...{Colors.ENDC}")
        
        # Get the forked repository URL
        while True:
            repo_url = input(f"{Colors.OKCYAN}Enter your forked repository URL: {Colors.ENDC}").strip()
            if self.validate_github_url(repo_url, self.progress.project_name):
                self.progress.api_keys['github_repo_url'] = repo_url
                self.progress.completed_services.append('github')
                print_success(f"GitHub repository configured: {repo_url}")
                break
            else:
                print_error("Invalid repository URL or name doesn't match project name")
    
    def validate_github_url(self, url: str, expected_name: str) -> bool:
        """Validate GitHub repository URL"""
        pattern = r'https://github\.com/[^/]+/' + re.escape(expected_name) + r'/?$'
        return bool(re.match(pattern, url))
    
    def step_2_vercel_manual(self):
        """Step 2: Manual Vercel project creation"""
        print_step(2, self.total_steps, "Vercel Project (Manual)")
        
        print_info("We'll guide you through creating your Vercel project manually.")
        print_info("This ensures everything works correctly and you learn the platform.")
        print()
        
        print(f"{Colors.BOLD}📋 Create Vercel Project:{Colors.ENDC}")
        print(f"1. Go to: {Colors.OKBLUE}https://vercel.com/new{Colors.ENDC}")
        print(f"2. Click {Colors.BOLD}'Import Git Repository'{Colors.ENDC}")
        print(f"3. Click {Colors.BOLD}'Continue with GitHub'{Colors.ENDC} (if not already connected)")
        print(f"4. Find your repository: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"5. Click {Colors.BOLD}'Import'{Colors.ENDC} next to your repository")
        print(f"6. In the configuration screen:")
        print(f"   • Project Name: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"   • Framework Preset: {Colors.BOLD}Next.js{Colors.ENDC}")
        print(f"   • Leave other settings as default")
        print(f"7. Click {Colors.BOLD}'Deploy'{Colors.ENDC}")
        print(f"8. {Colors.WARNING}Expected:{Colors.ENDC} The first deployment will fail - this is normal!")
        print(f"   • Error: 'POSTGRES_URL environment variable is not set'")
        print(f"   • We'll fix this by setting up the database and storage next")
        print(f"   • The project will still be created successfully")
        
        input(f"\n{Colors.OKCYAN}Press Enter when the deployment has finished (even if failed)...{Colors.ENDC}")
        
        print()
        print_info("Now we need your Vercel project dashboard URL:")
        print(f"   • Go to your Vercel dashboard: {Colors.OKBLUE}https://vercel.com{Colors.ENDC}")
        print(f"   • Find your project: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"   • Copy the URL from your browser address bar")
        
        # Get the project dashboard URL and construct the deployment URL
        while True:
            dashboard_url = input(f"{Colors.OKCYAN}Enter your Vercel project dashboard URL (e.g., https://vercel.com/username/{self.progress.project_name}): {Colors.ENDC}").strip()
            if dashboard_url and dashboard_url.startswith('https://vercel.com/'):
                # Validate URL format
                if f"{self.progress.project_name}" in dashboard_url:
                    # Construct the deployment URL (this will work once redeployed)
                    project_url = f"https://{self.progress.project_name}.vercel.app"
                    print_info(f"Your app URL will be: {project_url} (after successful redeploy)")
                    break
                else:
                    print_error(f"URL should contain '{self.progress.project_name}'")
            else:
                print_error("Please enter a valid Vercel dashboard URL (https://vercel.com/...)")
        
        print()
        print(f"{Colors.BOLD}📋 Set up Blob Storage:{Colors.ENDC}")
        print(f"1. In your Vercel dashboard, go to your project: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"2. Click on {Colors.BOLD}'Storage'{Colors.ENDC} tab")
        print(f"3. Click {Colors.BOLD}'Create Database'{Colors.ENDC}")
        print(f"4. Select {Colors.BOLD}'Blob'{Colors.ENDC}")
        print(f"5. Name it: {Colors.OKCYAN}{self.progress.project_name}-blob{Colors.ENDC}")
        print(f"6. Click {Colors.BOLD}'Create'{Colors.ENDC}")
        print(f"7. {Colors.OKGREEN}That's it!{Colors.ENDC} Vercel automatically adds the BLOB_READ_WRITE_TOKEN to your project")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've created the Blob storage...{Colors.ENDC}")
        
        # Store the configuration
        self.progress.service_configs['vercel'] = {
            'name': 'Vercel Project',
            'url': project_url,
            'credentials': {
                'project_url': project_url
            }
        }
        self.progress.completed_services.append('vercel')
        
        print_success(f"Vercel project configured: {project_url}")
        print_success("Blob storage configured - environment variables added automatically")
    
    def step_3_neon_manual(self):
        """Step 3: Manual Neon database setup"""
        print_step(3, self.total_steps, "Neon Database (Manual)")
        
        print_info("We'll set up your Neon database through Vercel's project dashboard.")
        print()
        
        print(f"{Colors.BOLD}📋 Set up Neon Database:{Colors.ENDC}")
        print(f"1. In your Vercel dashboard, go to your project: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"2. Click on {Colors.BOLD}'Storage'{Colors.ENDC} tab")
        print(f"3. Click {Colors.BOLD}'Create Database'{Colors.ENDC}")
        print(f"4. Select {Colors.BOLD}'Neon'{Colors.ENDC}")
        print(f"5. Choose {Colors.BOLD}'Create New Neon Account'{Colors.ENDC} or {Colors.BOLD}'Link Existing Account'{Colors.ENDC}")
        print(f"6. Complete the account setup/linking process")
        print(f"7. {Colors.OKGREEN}That's it!{Colors.ENDC} Vercel automatically adds the POSTGRES_URL to your project")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've created the Neon database...{Colors.ENDC}")
        
        self.progress.completed_services.append('neon')
        print_success("Neon database configured - environment variables added automatically")
    
    def step_polar_billing(self):
        """Step 4: Polar Billing Setup (Manual)"""
        print_step(4, self.total_steps, "Polar Billing (Manual)")
        print_info("We'll guide you through setting up Polar billing products manually.")
        print_info("This ensures everything works correctly and you learn the platform.")
        
        # Environment selection
        while True:
            environment = input(f"\n{Colors.OKCYAN}Use sandbox environment for testing? (y/n): {Colors.ENDC}").strip().lower()
            if environment in ['y', 'yes']:
                environment = 'sandbox'
                dashboard_url = "https://sandbox.polar.sh/dashboard"
                break
            elif environment in ['n', 'no']:
                environment = 'production'
                dashboard_url = "https://polar.sh/dashboard"
                break
            print_error("Please enter 'y' or 'n'")
        
        # Manual setup instructions
        print(f"\n{Colors.OKBLUE}📋 Create Polar Organization (if you don't have one):{Colors.ENDC}")
        print(f"1. Go to: {dashboard_url}")
        print(f"2. If you don't have an organization yet:")
        print(f"   • Click 'Create Organization'")
        print(f"   • Name it: {self.progress.project_name}-org")
        print(f"   • Complete the setup process")
        print(f"3. If you already have an organization, you can use it")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you have an organization ready...{Colors.ENDC}")
        
        print(f"\n{Colors.OKBLUE}📋 Create Products:{Colors.ENDC}")
        print(f"1. In your Polar dashboard, go to 'Products'")
        print(f"2. Click 'Create Product'")
        
        print(f"\n{Colors.WARNING}Create Product 1 - Pro Plan:{Colors.ENDC}")
        print(f"   • Name: Pro Plan")
        print(f"   • Description: Professional subscription with advanced features")
        print(f"   • Type: Subscription")
        print(f"   • Price: $20.00 USD per month")
        print(f"   • Click 'Create Product'")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've created the Pro Plan...{Colors.ENDC}")
        
        print(f"\n{Colors.WARNING}Create Product 2 - Business Plan:{Colors.ENDC}")
        print(f"   • Name: Business Plan")
        print(f"   • Description: Business subscription with premium features and priority support")
        print(f"   • Type: Subscription")
        print(f"   • Price: $200.00 USD per month")
        print(f"   • Click 'Create Product'")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've created the Business Plan...{Colors.ENDC}")
        
        # Get organization slug for the dashboard URL
        while True:
            org_slug = input(f"\n{Colors.OKCYAN}Enter your organization slug (from the URL, e.g., 'my-awesome-app-org'): {Colors.ENDC}").strip()
            if org_slug:
                break
            print_error("Please enter your organization slug")
        
        # Get product IDs
        print(f"\n{Colors.OKBLUE}📋 Get Product IDs:{Colors.ENDC}")
        print(f"1. In your Polar dashboard, go to 'Products'")
        print(f"2. Click on the 'Pro Plan' product")
        print(f"3. Copy the Product ID from the URL or product details")
        
        while True:
            pro_product_id = input(f"\n{Colors.OKCYAN}Enter Pro Plan Product ID: {Colors.ENDC}").strip()
            if pro_product_id:
                break
            print_error("Please enter the Pro Plan Product ID")
        
        print(f"\n4. Go back and click on the 'Business Plan' product")
        print(f"5. Copy the Product ID from the URL or product details")
        
        while True:
            business_product_id = input(f"\n{Colors.OKCYAN}Enter Business Plan Product ID: {Colors.ENDC}").strip()
            if business_product_id:
                break
            print_error("Please enter the Business Plan Product ID")
        
        # Save configuration
        service_config = ServiceConfig(
            name="Polar Billing",
            url=f"{dashboard_url}/{org_slug}",
            credentials={
                "organization_slug": org_slug,
                "pro_product_id": pro_product_id,
                "business_product_id": business_product_id,
                "environment": environment,
                "dashboard_url": f"{dashboard_url}/{org_slug}"
            },
            webhook_urls=[f"https://{self.progress.project_name}.vercel.app/api/billing/webhook"]
        )
        
        self.progress.service_configs['polar'] = service_config.to_dict()
        self.progress.completed_services.append('polar')
        ProgressManager.save_progress(self.progress)
        
        # Get Polar API Token
        print(f"\n{Colors.BOLD}📋 Create Polar API Token (Required for billing operations):{Colors.ENDC}")
        print(f"1. In your Polar dashboard, go to 'Settings'")
        print(f"2. Scroll down to 'API Tokens' section")
        print(f"3. Click 'Create Token'")
        print(f"4. Give it a name like: {Colors.OKCYAN}{self.progress.project_name}-api{Colors.ENDC}")
        print(f"5. Select scopes:")
        print(f"   • ☑️ products:read")
        print(f"   • ☑️ products:write")
        print(f"   • ☑️ checkouts:write")
        print(f"   • ☑️ subscriptions:read")
        print(f"   • ☑️ subscriptions:write")
        print(f"6. Click 'Create'")
        print(f"7. Copy the token (starts with 'polar_oat_')")
        
        while True:
            polar_token = input(f"\n{Colors.OKCYAN}Enter your Polar API token: {Colors.ENDC}").strip()
            if polar_token.startswith('polar_oat_'):
                self.progress.api_keys['polar_access_token'] = polar_token
                break
            print_error("Invalid token format. Token should start with 'polar_oat_'")
        
        # Set up Polar webhook
        print(f"\n{Colors.BOLD}📋 Set up Polar Webhook (Required for billing events):{Colors.ENDC}")
        print(f"1. In your Polar dashboard, go to {Colors.BOLD}'Webhooks'{Colors.ENDC}")
        print(f"2. Click {Colors.BOLD}'Add Endpoint'{Colors.ENDC}")
        print(f"3. Endpoint URL: {Colors.OKCYAN}https://{self.progress.project_name}.vercel.app/api/billing/webhook{Colors.ENDC}")
        print(f"4. Select events:")
        print(f"   • ☑️ subscription.created")
        print(f"   • ☑️ subscription.updated") 
        print(f"   • ☑️ subscription.canceled")
        print(f"5. Click {Colors.BOLD}'Create'{Colors.ENDC}")
        print(f"6. Copy the {Colors.BOLD}'Signing Secret'{Colors.ENDC}")
        
        while True:
            webhook_secret = input(f"\n{Colors.OKCYAN}Enter Polar Webhook Signing Secret: {Colors.ENDC}").strip()
            if webhook_secret:
                self.progress.api_keys['polar_webhook_secret'] = webhook_secret
                break
            print_error("Please enter the webhook signing secret")
        
        print_success(f"Polar billing configured: {dashboard_url}/{org_slug}")
        print_success("Pro Plan ($20/month) and Business Plan ($200/month) products created")
        print_success("API token configured for billing operations")
        print_success("Webhook configured for billing events!")
        
        return service_config
    
    def step_5_clerk_manual(self):
        """Step 5: Manual Clerk authentication setup"""
        print_step(5, self.total_steps, "Clerk Authentication (Manual)")
        
        print_info("We'll guide you through creating your Clerk authentication app.")
        print()
        
        print(f"{Colors.BOLD}📋 Create Clerk Application:{Colors.ENDC}")
        print(f"1. Go to: {Colors.OKBLUE}https://dashboard.clerk.com{Colors.ENDC}")
        print(f"2. Click {Colors.BOLD}'Add application'{Colors.ENDC}")
        print(f"3. Enter application name: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"4. Choose {Colors.BOLD}'Next.js'{Colors.ENDC} as your framework")
        print(f"5. Click {Colors.BOLD}'Create application'{Colors.ENDC}")
        print(f"6. Copy both API keys from the dashboard")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've created the Clerk application...{Colors.ENDC}")
        
        # Get Clerk API keys
        while True:
            publishable_key = input(f"{Colors.OKCYAN}Enter Clerk Publishable Key (pk_test_...): {Colors.ENDC}").strip()
            if publishable_key.startswith('pk_test_') or publishable_key.startswith('pk_live_'):
                break
            print_error("Invalid publishable key format")
        
        while True:
            secret_key = input(f"{Colors.OKCYAN}Enter Clerk Secret Key (sk_test_...): {Colors.ENDC}").strip()
            if secret_key.startswith('sk_test_') or secret_key.startswith('sk_live_'):
                break
            print_error("Invalid secret key format")
        
        self.progress.api_keys['clerk_publishable_key'] = publishable_key
        self.progress.api_keys['clerk_secret_key'] = secret_key
        
        # Set up Clerk webhook
        vercel_config = self.progress.service_configs.get('vercel', {})
        app_url = vercel_config.get('credentials', {}).get('project_url', 'your-app.vercel.app')
        
        print(f"\n{Colors.BOLD}📋 Set up Clerk Webhook (Required for user sync):{Colors.ENDC}")
        print(f"1. In your Clerk dashboard, go to {Colors.BOLD}'Webhooks'{Colors.ENDC}")
        print(f"2. Click {Colors.BOLD}'Add Endpoint'{Colors.ENDC}")
        print(f"3. Endpoint URL: {Colors.OKCYAN}{app_url}/api/clerk/webhook{Colors.ENDC}")
        print(f"4. Select events:")
        print(f"   • ☑️ user.created")
        print(f"   • ☑️ user.updated") 
        print(f"   • ☑️ user.deleted")
        print(f"5. Click {Colors.BOLD}'Create'{Colors.ENDC}")
        print(f"6. Copy the {Colors.BOLD}'Signing Secret'{Colors.ENDC} (starts with 'whsec_')")
        
        while True:
            webhook_secret = input(f"\n{Colors.OKCYAN}Enter Clerk Webhook Signing Secret: {Colors.ENDC}").strip()
            if webhook_secret.startswith('whsec_'):
                self.progress.api_keys['clerk_webhook_secret'] = webhook_secret
                break
            print_error("Invalid webhook secret format. Secret should start with 'whsec_'")
        
        self.progress.completed_services.append('clerk')
        
        print_success("Clerk authentication configured!")
        print_success("Webhook configured for user synchronization!")
        print()
        
        print(f"{Colors.BOLD}📋 Additional Clerk Setup (Optional - do this after deployment):{Colors.ENDC}")
        print(f"1. In your Clerk app, go to {Colors.BOLD}'User & Authentication > Social Connections'{Colors.ENDC}")
        print(f"2. Enable {Colors.BOLD}'Google'{Colors.ENDC} OAuth provider if desired")
        print(f"3. Configure other authentication methods as needed")
    
    def step_6_resend_manual(self):
        """Step 6: Manual Resend email service setup"""
        print_step(6, self.total_steps, "Resend Email Service (Manual)")
        
        print_info("We'll guide you through setting up Resend for email functionality.")
        print_info("Resend enables welcome emails, notifications, and other email features.")
        print()
        
        print(f"{Colors.BOLD}📋 Create Resend Account:{Colors.ENDC}")
        print(f"1. Go to: {Colors.OKBLUE}https://resend.com{Colors.ENDC}")
        print(f"2. Click {Colors.BOLD}'Sign up'{Colors.ENDC} and create a free account")
        print(f"3. Verify your email address")
        print(f"4. Complete the onboarding process")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've created your Resend account...{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}📋 Get Your API Key:{Colors.ENDC}")
        print(f"1. In your Resend dashboard, go to: {Colors.OKBLUE}https://resend.com/api-keys{Colors.ENDC}")
        print(f"2. Click {Colors.BOLD}'Create API Key'{Colors.ENDC}")
        print(f"3. Give it a name: {Colors.OKCYAN}{self.progress.project_name}-api{Colors.ENDC}")
        print(f"4. Select {Colors.BOLD}'Full access'{Colors.ENDC} for development")
        print(f"5. Click {Colors.BOLD}'Create'{Colors.ENDC}")
        print(f"6. Copy the API key (starts with 're_')")
        
        while True:
            resend_api_key = input(f"\n{Colors.OKCYAN}Enter your Resend API key: {Colors.ENDC}").strip()
            if resend_api_key.startswith('re_'):
                self.progress.api_keys['resend_api_key'] = resend_api_key
                break
            print_error("Invalid API key format. Key should start with 're_'")
        
        print(f"\n{Colors.BOLD}📋 Configure Email Settings:{Colors.ENDC}")
        print(f"For development, you can use the default Resend domain.")
        print(f"For production, you'll want to verify your own domain.")
        print()
        
        # Get sender email (optional, with default)
        print(f"Sender email configuration:")
        from_email = input(f"{Colors.OKCYAN}From email (press Enter for 'onboarding@resend.dev'): {Colors.ENDC}").strip()
        if not from_email:
            from_email = "onboarding@resend.dev"
        self.progress.api_keys['resend_from_email'] = from_email
        
        # Get sender name
        from_name = input(f"{Colors.OKCYAN}From name (press Enter for '{self.progress.project_name}'): {Colors.ENDC}").strip()
        if not from_name:
            from_name = self.progress.project_name.replace('-', ' ').title()
        self.progress.api_keys['resend_from_name'] = from_name
        
        # Get reply-to email (optional)
        reply_to = input(f"{Colors.OKCYAN}Reply-to email (optional, press Enter to skip): {Colors.ENDC}").strip()
        if reply_to:
            self.progress.api_keys['resend_reply_to'] = reply_to
        
        self.progress.completed_services.append('resend')
        
        print_success("Resend email service configured!")
        print_success("Welcome emails will be sent when users sign up!")
        print()
        
        print(f"{Colors.BOLD}📋 What's Already Implemented:{Colors.ENDC}")
        print(f"   • ✅ Welcome emails on user signup")
        print(f"   • ✅ HTML and text email templates")
        print(f"   • ✅ Error handling that doesn't break user creation")
        print(f"   • ✅ Email validation and logging")
        print()
        
        print(f"{Colors.BOLD}📋 Next Steps (After Setup):{Colors.ENDC}")
        print(f"   • For production: Verify your custom domain in Resend dashboard")
        print(f"   • Add more email templates for different use cases")
        print(f"   • Configure notification emails based on user preferences")
    
    def step_7_sentry_manual(self):
        """Step 7: Manual Sentry error monitoring setup"""
        print_step(7, self.total_steps, "Sentry Error Monitoring (Manual)")
        
        print_info("We'll guide you through creating your Sentry project for error monitoring.")
        print()
        
        print(f"{Colors.BOLD}📋 Create Sentry Project:{Colors.ENDC}")
        print(f"1. Go to: {Colors.OKBLUE}https://sentry.io{Colors.ENDC}")
        print(f"2. Sign up for a free account or log in")
        print(f"3. Click {Colors.BOLD}'Create Project'{Colors.ENDC}")
        print(f"4. Select {Colors.BOLD}'Next.js'{Colors.ENDC} as your platform")
        print(f"5. Enter project name: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"6. Select your team (or use default)")
        print(f"7. Click {Colors.BOLD}'Create Project'{Colors.ENDC}")
        print(f"8. Copy the DSN from the setup instructions")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've created the Sentry project...{Colors.ENDC}")
        
        # Get Sentry DSN
        print(f"\n{Colors.BOLD}📋 Get Sentry DSN:{Colors.ENDC}")
        print(f"1. In your Sentry project dashboard, go to {Colors.BOLD}'Settings > Projects'{Colors.ENDC}")
        print(f"2. Click on your project: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"3. Go to {Colors.BOLD}'Client Keys (DSN)'{Colors.ENDC}")
        print(f"4. Copy the DSN URL (should start with 'https://' and end with '.ingest.sentry.io')")
        
        while True:
            sentry_dsn = input(f"\n{Colors.OKCYAN}Enter your Sentry DSN: {Colors.ENDC}").strip()
            if sentry_dsn.startswith('https://') and '.ingest.sentry.io' in sentry_dsn:
                self.progress.api_keys['sentry_dsn'] = sentry_dsn
                break
            print_error("Invalid DSN format. DSN should start with 'https://' and contain '.ingest.sentry.io'")
        
        self.progress.completed_services.append('sentry')
        
        print_success("Sentry error monitoring configured!")
        print_success("Your app will now track errors and performance metrics!")
        print()
        
        print(f"{Colors.BOLD}📋 Additional Sentry Features (Optional):{Colors.ENDC}")
        print(f"1. Performance Monitoring: Already enabled by default")
        print(f"2. Session Replay: Already enabled for debugging")
        print(f"3. Alerts: Configure in Sentry dashboard for critical errors")
        print(f"4. Releases: Track deployments in your Sentry project")
    
    def step_8_vercel_env_vars(self):
        """Step 8: Add environment variables to Vercel project"""
        print_step(8, self.total_steps, "Vercel Environment Variables (Critical)")
        
        print_info("We'll generate a .env.prod file with all your environment variables.")
        print_info("You can then copy and paste them into your Vercel project settings.")
        print()
        
        # Generate .env.prod file
        self.generate_env_prod_file()
        
        vercel_config = self.progress.service_configs.get('vercel', {})
        project_url = vercel_config.get('credentials', {}).get('project_url', 'your-app.vercel.app')
        
        print(f"{Colors.BOLD}📋 Add Environment Variables to Vercel:{Colors.ENDC}")
        print(f"1. Go to your Vercel dashboard: {Colors.OKBLUE}https://vercel.com{Colors.ENDC}")
        print(f"2. Find your project: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        print(f"3. Click on your project name")
        print(f"4. Go to {Colors.BOLD}'Settings'{Colors.ENDC} tab")
        print(f"5. Click {Colors.BOLD}'Environment Variables'{Colors.ENDC} in the sidebar")
        print(f"6. Open {Colors.BOLD}.env.prod{Colors.ENDC} file and copy each variable:")
        print(f"   • For each line in .env.prod:")
        print(f"   • Copy the variable name (before =)")
        print(f"   • Copy the variable value (after =)")
        print(f"   • Add to Vercel with Environment: {Colors.BOLD}Production, Preview, Development{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}💡 Important Notes:{Colors.ENDC}")
        print(f"   • {Colors.OKGREEN}POSTGRES_URL and BLOB_READ_WRITE_TOKEN are already set by Vercel{Colors.ENDC}")
        print(f"   • Skip these if they already exist in your Vercel environment variables")
        print(f"   • {Colors.WARNING}CRON_SECRET is required for secure subscription syncing{Colors.ENDC}")
        print(f"   • Click {Colors.BOLD}'Save'{Colors.ENDC} after adding each variable")
        
        input(f"\n{Colors.OKCYAN}Press Enter when you've added all environment variables to Vercel...{Colors.ENDC}")
        
        self.progress.completed_services.append('vercel-env')
        print_success("Vercel environment variables configured!")
        print_success("Your deployment should now work correctly!")
    
    def generate_env_prod_file(self):
        """Generate .env.prod file for Vercel environment variables"""
        print_info("Generating .env.prod file for Vercel...")
        
        # Generate CRON_SECRET for secure cron endpoint
        import secrets
        import base64
        cron_secret = base64.b64encode(secrets.token_bytes(32)).decode('utf-8')
        self.progress.api_keys['cron_secret'] = cron_secret
        print_success(f"Generated secure CRON_SECRET for subscription syncing")
        
        vercel_config = self.progress.service_configs.get('vercel', {}).get('credentials', {})
        polar_config = self.progress.service_configs.get('polar', {}).get('credentials', {})
        
        env_prod_content = f"""# ===================================
# VERCEL PRODUCTION ENVIRONMENT VARIABLES
# ===================================
# Copy these variables to your Vercel project settings
# Go to: Vercel Dashboard > Project > Settings > Environment Variables

# ===================================
# CLERK AUTHENTICATION
# ===================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY={self.progress.api_keys.get('clerk_publishable_key', 'pk_test_your_clerk_publishable_key_here')}
CLERK_SECRET_KEY={self.progress.api_keys.get('clerk_secret_key', 'sk_test_your_clerk_secret_key_here')}
CLERK_WEBHOOK_SECRET={self.progress.api_keys.get('clerk_webhook_secret', 'whsec_your_clerk_webhook_secret_here')}
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ===================================
# POLAR BILLING
# ===================================
POLAR_ACCESS_TOKEN={self.progress.api_keys.get('polar_access_token', 'polar_oat_your_polar_token_here')}
POLAR_ENVIRONMENT={polar_config.get('environment', 'sandbox')}
POLAR_ORGANIZATION_ID={polar_config.get('organization_slug', '')}
POLAR_PRO_PRODUCT_ID={polar_config.get('pro_product_id', '')}
POLAR_BUSINESS_PRODUCT_ID={polar_config.get('business_product_id', '')}
POLAR_WEBHOOK_SECRET={self.progress.api_keys.get('polar_webhook_secret', 'polar_webhook_secret_here')}

# ===================================
# SENTRY ERROR MONITORING
# ===================================
NEXT_PUBLIC_SENTRY_DSN={self.progress.api_keys.get('sentry_dsn', 'https://your-sentry-dsn-here.ingest.sentry.io/project-id')}

# ===================================
# RESEND EMAIL SERVICE
# ===================================
RESEND_API_KEY={self.progress.api_keys.get('resend_api_key', 're_your_resend_api_key_here')}
RESEND_FROM_EMAIL={self.progress.api_keys.get('resend_from_email', 'onboarding@resend.dev')}
RESEND_FROM_NAME={self.progress.api_keys.get('resend_from_name', 'Your App Name')}
{f"RESEND_REPLY_TO={self.progress.api_keys.get('resend_reply_to')}" if self.progress.api_keys.get('resend_reply_to') else '# RESEND_REPLY_TO=support@yourdomain.com'}

# ===================================
# APPLICATION CONFIGURATION
# ===================================
NEXT_PUBLIC_APP_URL={vercel_config.get('project_url', 'http://localhost:3000')}
NODE_ENV=production

# ===================================
# SUBSCRIPTION SYNC CRON
# ===================================
CRON_SECRET={self.progress.api_keys.get('cron_secret', 'generated_cron_secret_here')}

# ===================================
# NOTE: These are already set by Vercel
# ===================================
# POSTGRES_URL=postgresql://... (set automatically by Neon integration)
# BLOB_READ_WRITE_TOKEN=vercel_blob_... (set automatically by Blob storage)
"""
        
        # Save .env.prod file
        with open('.env.prod', 'w') as f:
            f.write(env_prod_content)
        
        print_success(".env.prod file generated successfully!")
        print_info("Use this file to copy environment variables to Vercel")
    
    def generate_env_file(self):
        """Generate .env file for local development"""
        print()
        print_info("Generating .env file for local development...")
        
        polar_config = self.progress.service_configs.get('polar', {}).get('credentials', {})
        
        env_content = f"""# Database
# ------------------------------------------------------------------------------------
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres

POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Clerk
# ------------------------------------------------------------------------------------
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY={self.progress.api_keys.get('clerk_publishable_key', 'pk_test_your_clerk_publishable_key_here')}
CLERK_SECRET_KEY={self.progress.api_keys.get('clerk_secret_key', 'sk_test_your_clerk_secret_key_here')}
CLERK_WEBHOOK_SECRET={self.progress.api_keys.get('clerk_webhook_secret', 'whsec_your_clerk_webhook_secret_here')}

# Polar
# ------------------------------------------------------------------------------------
POLAR_ENVIRONMENT={polar_config.get('environment', 'sandbox')}
POLAR_ACCESS_TOKEN={self.progress.api_keys.get('polar_access_token', 'polar_oat_your_polar_token_here')}
POLAR_SUCCESS_URL=http://localhost:3000/billing/success?checkout_id={{CHECKOUT_ID}}
POLAR_WEBHOOK_SECRET={self.progress.api_keys.get('polar_webhook_secret', 'polar_webhook_secret_here')}

POLAR_PRO_PRODUCT_ID={polar_config.get('pro_product_id', '')}
POLAR_BUSINESS_PRODUCT_ID={polar_config.get('business_product_id', '')}

# Sentry
# ------------------------------------------------------------------------------------
NEXT_PUBLIC_SENTRY_DSN={self.progress.api_keys.get('sentry_dsn', 'https://your-sentry-dsn-here.ingest.sentry.io/project-id')}

# Resend (Email Service)
# ------------------------------------------------------------------------------------
RESEND_API_KEY={self.progress.api_keys.get('resend_api_key', 're_your_resend_api_key_here')}
RESEND_FROM_EMAIL={self.progress.api_keys.get('resend_from_email', 'onboarding@resend.dev')}
RESEND_FROM_NAME={self.progress.api_keys.get('resend_from_name', 'Kosuke Template')}
{f"RESEND_REPLY_TO={self.progress.api_keys.get('resend_reply_to')}" if self.progress.api_keys.get('resend_reply_to') else '# RESEND_REPLY_TO=support@yourdomain.com'}

# App URLs
# ------------------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Subscription Sync Cron
# ------------------------------------------------------------------------------------
CRON_SECRET={self.progress.api_keys.get('cron_secret', 'generated_cron_secret_here')}
"""
        
        # Save .env file
        with open('.env', 'w') as f:
            f.write(env_content)
        
        print_success(".env file generated for local development!")
        print_info("💡 Note: .env.prod file contains production variables for Vercel")
    
    def print_completion_summary(self):
        """Print setup completion summary"""
        print("\n" + "="*80)
        print(f"{Colors.HEADER}{Colors.BOLD}🎉 INTERACTIVE SETUP COMPLETE! 🎉{Colors.ENDC}")
        print("="*80)
        
        print(f"\n{Colors.BOLD}📊 Project Summary:{Colors.ENDC}")
        print(f"   Project Name: {Colors.OKCYAN}{self.progress.project_name}{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}✅ Completed Setup:{Colors.ENDC}")
        if 'github' in self.progress.completed_services:
            print(f"   • GitHub Repository: {Colors.OKBLUE}{self.progress.api_keys.get('github_repo_url', '')}{Colors.ENDC}")
        if 'vercel' in self.progress.completed_services:
            vercel_url = self.progress.service_configs.get('vercel', {}).get('url', '')
            print(f"   • Vercel Project: {Colors.OKBLUE}{vercel_url}{Colors.ENDC}")
            print(f"   • Blob Storage: {Colors.OKGREEN}Configured automatically{Colors.ENDC}")
        if 'neon' in self.progress.completed_services:
            print(f"   • Neon Database: {Colors.OKGREEN}Integrated through Vercel{Colors.ENDC}")
        if 'polar' in self.progress.completed_services:
            polar_url = self.progress.service_configs.get('polar', {}).get('url', '')
            print(f"   • Polar Billing: {Colors.OKBLUE}{polar_url}{Colors.ENDC}")
        if 'clerk' in self.progress.completed_services:
            print(f"   • Clerk Authentication: {Colors.OKGREEN}Application created{Colors.ENDC}")
        if 'resend' in self.progress.completed_services:
            print(f"   • Resend Email Service: {Colors.OKGREEN}API key configured{Colors.ENDC}")
        if 'sentry' in self.progress.completed_services:
            print(f"   • Sentry Error Monitoring: {Colors.OKGREEN}Project created{Colors.ENDC}")
        if 'vercel-env' in self.progress.completed_services:
            print(f"   • Vercel Environment Variables: {Colors.OKGREEN}All variables configured{Colors.ENDC}")
            print(f"   • Subscription Sync Cron: {Colors.OKGREEN}Secure token generated{Colors.ENDC}")
        
        print(f"\n{Colors.BOLD}📁 Next Steps:{Colors.ENDC}")
        repo_url = self.progress.api_keys.get('github_repo_url', '')
        print(f"   1. {Colors.OKGREEN}Your Vercel project is ready!{Colors.ENDC}")
        print(f"      • Environment variables are configured in Vercel")
        print(f"      • Deployment should work automatically")
        print(f"      • Subscription sync runs automatically every 6 hours")
        print(f"      • If needed, trigger a redeploy from your dashboard")
        print(f"   2. Clone your repository: {Colors.OKCYAN}git clone {repo_url}.git{Colors.ENDC}")
        print(f"   3. Copy environment files: {Colors.OKCYAN}cp ../cli/.env . && cp ../cli/.env.prod .{Colors.ENDC}")
        print(f"   4. Set up local database: {Colors.OKCYAN}docker-compose up -d postgres{Colors.ENDC}")
        print(f"   5. Install dependencies: {Colors.OKCYAN}pnpm install{Colors.ENDC}")
        print(f"   6. Start development: {Colors.OKCYAN}pnpm run dev{Colors.ENDC}")
        print(f"   7. Environment files:")
        print(f"      • {Colors.OKCYAN}.env{Colors.ENDC} - Local development (localhost, docker-compose)")
        print(f"      • {Colors.OKCYAN}.env.prod{Colors.ENDC} - Production reference (already in Vercel)")
        
        print(f"\n{Colors.BOLD}🚀 Your kosuke template is ready to use!{Colors.ENDC}")
        print("="*80)

def main():
    """Main function"""
    try:
        setup = InteractiveSetup()
        setup.start()
        
    except KeyboardInterrupt:
        print_error("\nSetup cancelled by user")
        print_info("Progress has been saved. Run the script again to resume.")
        sys.exit(1)
    except Exception as e:
        print_error(f"Setup failed: {e}")
        logger.exception("Setup error")
        print_info("Progress has been saved. Run the script again to resume.")
        sys.exit(1)

if __name__ == "__main__":
    main()
