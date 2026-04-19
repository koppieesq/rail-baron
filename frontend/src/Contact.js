import { useState } from 'react';
import emailjs from '@emailjs/browser';
import './Contact.css';
import { T } from './Translator';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [submitResult, setSubmitResult] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await emailjs.send(
        'service_c36mope',
        'template_g9oya6i',
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message
        },
        'oJdd21U8HbQm9cdcM'
      );
      setSubmitResult(
        <div className="success">
          <p><T>Message sent successfully!</T></p>
        </div>
      );
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Error sending email:', error);
      setSubmitResult(
        <div className="failure">
          <p><T>Message failed to send.</T></p>
        </div>
      );
    }
  };

  return (
    <div className="contact">
      <h2><T>Contact</T></h2>
      <p><T>Phone: 707-456-7743</T></p>
      <form onSubmit={handleSubmit}>
        <p>
          <label htmlFor="name"><T>Name:</T> </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </p>
        <p>
          <label htmlFor="email"><T>Email:</T> </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </p>
        <p>
          <label htmlFor="message"><T>Message:</T> </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
          />
        </p>
        <button type="submit"><T>Submit</T></button>
      </form>
      <div className="results">{submitResult}</div>
    </div>
  );
}

export default Contact;
