"use client";

import React, { Fragment, useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams } from "react-router-dom";

import { Container } from "reactstrap";
import apiClient from "@/lib/axiosInstance";
import { encryptData, decryptData } from "@/hooks/crypto";
import {
  ADMIN_API_ENDPOINT,
  ANNOUNCEMENT_CREATE_EDIT,
  ANNOUNCEMENT_VIEW,
  SUCCESS,
} from "@/constant/index";
import { toastSuccess, toastError } from "@/hooks/toastMsg";

type Nullable<T> = T | null;

interface Authenticated {
  userId: string;
  [k: string]: unknown;
}

interface FormShape {
  userId: string;
  title: string;
  announcement?: string;
  status: number | string; // keep as original (they passed string then parseInt)
  announcementId?: string;
  shortDescription?: string; // kept because your original initial state had it
}

interface Props {
  /** Optional: when used standalone via route param; for modal leave it undefined */
  announcementId?: string;
  /** Optional: called on successful create/edit (good for closing modal + refresh) */
  onSuccess?: () => void;
  /** Optional: handle close (used by modal) */
  onClose?: () => void;
}

const AnnouncementForm: React.FC<Props> = ({ announcementId: propAnnouncementId, onSuccess, onClose }) => {
  // If used in route page, pull from URL. For modal, prop takes precedence if provided.
  const params = useParams<{ announcementId: string }>();
  const announcementId = propAnnouncementId ?? params.announcementId;


  const deviceType = localStorage.getItem("deviceType") || "";
  const jwt_token = localStorage.getItem("token") || "";
  const authenticated: Authenticated | null = (() => {
    try {
      const raw = localStorage.getItem("authenticated");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const initialFormData: FormShape = {
    userId: "",
    title: "",
    shortDescription: "",
    status: 1,
  };
  const [formData, setFormData] = useState<FormShape>(initialFormData);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const nValue = value;
    setFormData((prev) => ({
      ...prev,
      [name]: nValue,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!formData.title || !formData.announcement || !formData.status) {
      toastError("Please fill in all fields");
      return;
    }

    try {
      let data: Record<string, any> = {
        userId: authenticated?.userId,
        title: formData.title,
        announcement: formData.announcement,
        status: parseInt(String(formData.status), 10),
      };

      if (announcementId) {
        data.announcementId = announcementId;
      }

      const payload = encryptData(data);
      const formDataParam = JSON.stringify({ data: payload });

      apiClient
        .post(ADMIN_API_ENDPOINT + ANNOUNCEMENT_CREATE_EDIT, formDataParam, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType,
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            // const rdata = decryptData(response.data.data) // not used
            handleReset(); // reset+route
            toastSuccess(response.data.message);

            if (onSuccess) {
              onSuccess(); // for modal usage
              return;
            }
            // original redirect:
            window.location.href = `${window.location.origin}/announcement`;
          } else {
            toastError(response.data.message);
          }
        })
        .catch((error) => {
          toastError(error?.response?.data?.message || "Request failed");
          console.error("Login error:", error);
        });
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  const handleReset = () => {
    if (!onSuccess) {
      // page mode: navigate back
     
    }
    setFormData(initialFormData);
  };

  const fetchDataFromAPI = async (aid: string) => {
    try {
      const payload = encryptData({ announcementId: aid });
      const data = JSON.stringify({ data: payload });

      apiClient
        .post(ADMIN_API_ENDPOINT + ANNOUNCEMENT_VIEW, data, {
          headers: {
            Authorization: jwt_token,
            "Content-Type": "application/json",
            deviceType,
          },
        })
        .then((response) => {
          if (response.data.statusCode == SUCCESS) {
            const rdata = decryptData(response.data.data) as Record<string, any>;
            setFormData({
              announcementId: aid,
              userId: rdata.userId,
              title: rdata.title,
              announcement: rdata.announcement,
              status: rdata.status,
            });
          } else {
            toastError(response.data.message);
          }
        })
        .catch((error) => {
          toastError(error?.response?.data?.message || "Request failed");
          console.error("Login error:", error);
        });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    if (announcementId) {
      fetchDataFromAPI(announcementId);
    }
    document.title = "Admin Panel | Create Announcement";
    return () => {
      document.title = "Admin Panel";
    };
  }, [announcementId]);

  // If embedded in a full page, keep the original header + container.
  // If used in modal, you can render just the <form> portion.
  const isModalUsage = Boolean(onClose || onSuccess);

  const FormUI = (
    <form className="row g-3" onSubmit={handleSubmit as any} onReset={handleReset}>
      <div className="col-xxl-6 col-sm-6">
        <label className="col-form-label" htmlFor="title">
          Title <span className="text-danger">*</span>
        </label>
        <input
          className="form-control"
          id="title"
          name="title"
          type="text"
          value={formData.title}
          placeholder="Enter Title"
          onChange={handleChange}
        />
      </div>

      <div className="col-xxl-6 col-sm-6">
        <label className="col-form-label" htmlFor="announcement">
          Announcement <span className="text-danger">*</span>
        </label>
        <textarea
          className="form-control"
          id="announcement"
          name="announcement"
          value={formData.announcement || ""}
          placeholder="Enter Announcement"
          onChange={handleChange}
        />
      </div>

      <div className="col-xxl-2 col-sm-4">
        <label className="col-form-label" htmlFor="status">
          Status <span className="text-danger">*</span>
        </label>
        <br />
        <div className="radio-option">
          <input
            className="m-r-5"
            id="status-active"
            name="status"
            type="radio"
            value="1"
            checked={String(formData.status) == "1"}
            onClick={handleChange}
          />
          <p className="help is-success m-0 d-inline-block"> Active </p>
        </div>
        <div className="radio-option">
          <input
            className="m-r-5"
            id="status-inactive"
            name="status"
            type="radio"
            value="0"
            checked={String(formData.status) == "0"}
            onClick={handleChange}
          />
          <p className="help is-success m-0 d-inline-block"> In-Active </p>
        </div>
      </div>

      <div className="col-12 d-flex justify-content-end gap-2">
        <button className="btn btn-primary me-2" type="submit" onClick={handleSubmit as any}>
          Submit
        </button>
        <button className="btn btn-light" type="reset" onClick={isModalUsage ? onClose : undefined} value="Cancel">
          {isModalUsage ? "Cancel" : "Back"}
        </button>
      </div>
    </form>
  );

  if (isModalUsage) {
    // Modal embedding: Only render the body of the form.
    return <Fragment>{FormUI}</Fragment>;
  }

  // Standalone page (edit route usage)
  return (
    <Fragment>

      <Container fluid={true}>
        <div className="row">
          <div className="col-sm-12">
            <div className="card">
              <div className="card-header pb-0">
                <h4>Announcement</h4>
                <p className="f-m-light mt-1">Fill the below form with create the new Banner.</p>
              </div>
              <div className="card-body pt-2">{FormUI}</div>
            </div>
          </div>
        </div>
      </Container>
    </Fragment>
  );
};

export default AnnouncementForm;
