from flask import jsonify
from app import db
import logging

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """Register error handlers for the Flask app"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'success': False,
            'message': 'Bad request',
            'data': None
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'success': False,
            'message': 'Unauthorized access',
            'data': None
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'success': False,
            'message': 'Forbidden access',
            'data': None
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'message': 'Resource not found',
            'data': None
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        logger.error(f'Internal server error: {error}')
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'data': None
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        db.session.rollback()
        logger.error(f'Unhandled exception: {e}')
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred',
            'data': None
        }), 500
