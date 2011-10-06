package org.auscope.portal.server.web.controllers;

import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.apache.commons.httpclient.HttpMethodBase;
import org.auscope.portal.server.domain.filter.FilterBoundingBox;
import org.auscope.portal.server.util.GmlToKml;
import org.auscope.portal.server.web.ErrorMessages;
import org.auscope.portal.server.web.service.BoreholeService;
import org.auscope.portal.server.web.service.CSWCacheService;
import org.auscope.portal.server.web.service.HttpServiceCaller;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

/**
 * Controller for handling requests for the NVCL boreholes
 * @author Josh Vote
 *
 */
@Controller
public class NVCLController extends BaseWFSToKMLController {

    private BoreholeService boreholeService;
    private CSWCacheService cswService;

    @Autowired
    public NVCLController(GmlToKml gmlToKml,
                            BoreholeService boreholeService,
                            HttpServiceCaller httpServiceCaller,
                            CSWCacheService cswService) {

        this.boreholeService = boreholeService;
        this.gmlToKml = gmlToKml;
        this.httpServiceCaller = httpServiceCaller;
        this.cswService = cswService;
    }



    /**
     * Handles the borehole filter queries.
     *
     * @param serviceUrl the url of the service to query
     * @param mineName   the name of the mine to query for
     * @param request    the HTTP client request
     * @return a WFS response converted into KML
     * @throws Exception
     */
    @RequestMapping("/doBoreholeFilter.do")
    public ModelAndView doBoreholeFilter( @RequestParam("serviceUrl") String serviceUrl,
                                      @RequestParam(required=false, value="boreholeName", defaultValue="")     String boreholeName,
                                      @RequestParam(required=false, value="custodian", defaultValue="")        String custodian,
                                      @RequestParam(required=false, value="dateOfDrilling", defaultValue="")   String dateOfDrilling,
                                      @RequestParam(required=false, value="maxFeatures", defaultValue="0") int maxFeatures,
                                      @RequestParam(required=false, value="bbox") String bboxJson,
                                      HttpServletRequest request) throws Exception {


        FilterBoundingBox bbox = FilterBoundingBox.attemptParseFromJSON(bboxJson);
        return doBoreholeFilter(serviceUrl,boreholeName, custodian, dateOfDrilling, maxFeatures,bbox, request);
    }

    /**
     * Handles the borehole filter queries.
     *
     * @param serviceUrl the url of the service to query
     * @param mineName   the name of the mine to query for
     * @param request    the HTTP client request
     * @return a WFS response converted into KML
     * @throws Exception
     */
    public ModelAndView doBoreholeFilter(String serviceUrl,String boreholeName,String custodian,
                                        String dateOfDrilling,int maxFeatures,FilterBoundingBox bbox,
                                        HttpServletRequest request) throws Exception {

        HttpMethodBase method = null;
        try {
            method = this.boreholeService.getAllBoreholes(serviceUrl, boreholeName, custodian, dateOfDrilling, maxFeatures, bbox);
            String gmlBlob = this.httpServiceCaller.getMethodResponseAsString(method, httpServiceCaller.getHttpClient());

            String kmlBlob = convertToKml(gmlBlob, request, serviceUrl);

            //log.debug(kmlBlob);
            // This failure test should be more robust,
            // it should try to extract an error message
            if (kmlBlob == null || kmlBlob.length() == 0) {
                log.error(String.format("Transform failed serviceUrl='%1$s' gmlBlob='%2$s'", serviceUrl, gmlBlob));
                return makeModelAndViewFailure(ErrorMessages.OPERATION_FAILED, method);
            } else {
                return makeModelAndViewKML(kmlBlob, gmlBlob, method);
            }
        } catch (Exception e) {
            return this.generateExceptionResponse(e, serviceUrl, method);
        }
    }
}
