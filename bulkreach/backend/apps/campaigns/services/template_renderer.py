"""
Template renderer service — uses Jinja2 to inject variables into email templates.
Supports {{ variable_name }} syntax strictly.
"""
import logging
from jinja2 import Environment, BaseLoader, TemplateSyntaxError, UndefinedError, Undefined
from jinja2.sandbox import SandboxedEnvironment

logger = logging.getLogger(__name__)


class SilentUndefined(Undefined):
    """
    Jinja2 Undefined handler that silently returns an empty string for undefined variables
    and nested attributes, preventing TemplateRendering errors.
    """
    def _fail_with_undefined_error(self, *args, **kwargs):
        return ""

    def __getattr__(self, name):
        return self

    def __getitem__(self, key):
        return self


class TemplateRenderer:
    """
    Renders Jinja2 HTML templates with recipient-specific data.
    Uses SandboxedEnvironment to prevent code execution in templates.
    """

    def __init__(self):
        self._env = SandboxedEnvironment(
            loader=BaseLoader(),
            autoescape=True,  # XSS-safe output
            keep_trailing_newline=True,
            undefined=SilentUndefined,
        )

    def render(self, template_string: str, context: dict) -> str:
        """
        Render a template string with given context variables.

        Args:
            template_string: HTML with {{ variable_name }} placeholders.
            context: Dict of variable_name → value.

        Returns:
            Rendered HTML string.

        Raises:
            ValueError: On template syntax errors.
        """
        try:
            template = self._env.from_string(template_string)
            return template.render(**context)
        except TemplateSyntaxError as exc:
            logger.error("Template syntax error: %s", exc)
            raise ValueError(f"Template syntax error at line {exc.lineno}: {exc.message}") from exc
        except UndefinedError as exc:
            # Fallback in case some UndefinedError is still raised
            logger.warning("Template undefined variable error: %s", exc)
            return ""
        except Exception as exc:
            logger.error("Template render error: %s", exc)
            raise ValueError(f"Template render failed: {exc}") from exc

    def render_subject(self, subject_template: str, context: dict) -> str:
        """Render the email subject line (plain text, no autoescape needed)."""
        env = SandboxedEnvironment(
            loader=BaseLoader(),
            autoescape=False,
            undefined=SilentUndefined,
        )
        try:
            t = env.from_string(subject_template)
            return t.render(**context)
        except Exception as exc:
            logger.warning("Subject render error, using raw subject: %s", exc)
            return subject_template
