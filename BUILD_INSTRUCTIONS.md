# OSCAR Flower - Build & Deploy Instructions

## Quick Start

After making any changes to the OSCAR Flower UI (templates, SCSS, static files), follow these steps:

### 1. Build and Deploy the Wheel

```bash
cd /Users/coreyellis/Projects/repos/github.com/oscar_app/flower
./build_and_deploy.sh
```

This script will:
- ✓ Compile SCSS to CSS
- ✓ Clean old builds
- ✓ Build new wheel package
- ✓ Copy wheel to `oscar-taskmanager/wheels/`

### 2. Rebuild Taskmanager Container

```bash
cd ../oscar
./oscar compile taskmanager
```

This will rebuild the taskmanager Docker image with the new oscar-flower wheel.

### 3. Restart Services

```bash
./oscar restart taskmanager
./oscar restart flower
```

---

## Manual Process (if script doesn't work)

If you need to do this manually:

```bash
# 1. Compile SCSS
cd /Users/coreyellis/Projects/repos/github.com/oscar_app/flower
npx sass bootstrap-scss/flower.scss:flower/static/css/flower.css --style compressed

# 2. Build wheel
python setup.py sdist bdist_wheel

# 3. Copy wheel
cp dist/oscar_flower-*.whl ../oscar/oscar-taskmanager/wheels/

# 4. Rebuild container
cd ../oscar
./oscar compile taskmanager

# 5. Restart services
./oscar restart taskmanager flower
```

---

## What Was Changed

### UI Customizations:
- **Ericsson Logo**: Ericsson logo (48x48 PNG) in navbar
- **Dark Theme**: #242424 background matching oscar-adminui
- **Yellow Accent**: #FAD22D for brand consistency
- **Montserrat Font**: Loaded from Google Fonts
- **Documentation Link**: Hidden from navbar
- **Logo Padding**: Added 1rem left padding for better spacing

### Files Modified:
- `flower/templates/navbar.html` - OSCAR branding and Ericsson logo
- `flower/templates/base.html` - Font imports
- `bootstrap-scss/flower.scss` - Complete OSCAR theme (cleaned 540KB vs 280MB)
- `flower/static/images/ericsson-logo-dark-48.png` - Ericsson logo
- `setup.py` - Package name changed to oscar-flower

### Directory Structure:
- `bootstrap-scss/` - Cleaned Bootstrap SCSS files only (540KB, tracked in git)
- `bootstrap-5.2.3/` - REMOVED (was 280MB with node_modules, build artifacts)

### Docker Integration:
- Wheel installed in `oscar-taskmanager/Dockerfile` BEFORE requirements.txt
- `flower` dependency commented out in requirements.txt
- Import name remains `flower` (transparent to code)

---

## Troubleshooting

### Script Fails to Build
```bash
# Check if in correct directory
pwd  # Should be: /Users/coreyellis/Projects/repos/github.com/oscar_app/flower

# Check if npm/sass is installed
npx sass --version

# Check if Python build tools are installed
pip list | grep wheel
```

### Container Fails to Rebuild
```bash
# Check Docker is running
docker ps

# View build logs
./oscar compile taskmanager 2>&1 | tee build.log
```

### Changes Not Visible
```bash
# Verify wheel was copied
ls -lh ../oscar/oscar-taskmanager/wheels/

# Check if flower is using custom package
docker exec flower pip show oscar-flower

# Hard restart
./oscar stop taskmanager flower
./oscar start taskmanager flower
```

---

## Development Workflow

**Typical workflow after making UI changes:**

1. Edit templates/SCSS in flower directory
2. Run `./build_and_deploy.sh`
3. Run `./oscar compile taskmanager`
4. Run `./oscar restart taskmanager flower`
5. Refresh browser to see changes

**Total time:** ~2-3 minutes
